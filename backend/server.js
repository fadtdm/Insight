require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with your secure environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();


const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
// 1. CORS Configuration (Fixes the frontend connection)
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// --- NEW: Auto-Create Custom Charts Table ---
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_charts (
        chart_id SERIAL PRIMARY KEY,
        dataset_id INTEGER REFERENCES datasets(dataset_id),
        user_id INTEGER REFERENCES users(user_id),
        chart_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        x_axis_column VARCHAR(255) NOT NULL,
        y_axis_column VARCHAR(255) NOT NULL,
        filter_column VARCHAR(255),
        filter_value VARCHAR(255)
      )
    `);
    console.log("Database tables checked/created.");
  } catch (err) {
    console.error("DB Init Error:", err);
  }
};
initDB();

// 2. Security Middleware (The "verifyToken" definition)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// --- ROUTES ---

// Login (UC-01) - FIXED PASSWORD VERIFICATION
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // 👉 Enforce strict string match for authentication
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { user_id: user.user_id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '2h' }
      );
      res.json({ token, role: user.role });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Data Upload (UC-02)
app.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  try {
    const dbResult = await pool.query(
      'INSERT INTO datasets (user_id, file_name, file_path) VALUES ($1, $2, $3) RETURNING dataset_id',
      [req.user.user_id, req.file.originalname, req.file.path]
    );
    res.json({ message: 'Upload success', dataset_id: dbResult.rows[0].dataset_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Data with RLS (UC-06) - FIXED ACCESS LOGIC
app.get('/dashboard-data', verifyToken, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'Admin') {
      // Admins see all datasets
      query = 'SELECT * FROM datasets';
      params = [];
    } else {
      // Users see datasets they uploaded OR datasets they have been granted RLS rules for
      query = `
        SELECT DISTINCT d.* FROM datasets d
        LEFT JOIN rls_rule r ON d.dataset_id = r.dataset_id
        WHERE d.user_id = $1 OR r.user_id = $1
      `;
      params = [req.user.user_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REAL GEMINI AI ANALYTICS AGENT ENDPOINT ---
app.post('/api/ai-insights', verifyToken, async (req, res) => {
  const { datasetName, xAxis, yAxis, labels, values } = req.body;

  if (!labels || !values || labels.length === 0) {
    return res.status(400).json({ error: 'No chart data provided.' });
  }

  try {
    // 1. Prepare the data summary to feed to the AI
    const combinedData = labels.map((label, index) => ({
      category: label,
      value: values[index]
    })).sort((a, b) => b.value - a.value).slice(0, 10); 

    const highest = combinedData[0];
    const lowest = combinedData[combinedData.length - 1];
    const total = combinedData.reduce((sum, item) => sum + item.value, 0);

    // 2. Build the Prompt for Gemini
    const prompt = `
      You are an expert business data analyst. Analyze this dataset named "${datasetName}".
      The X-Axis represents: ${xAxis}. The Y-Axis represents: ${yAxis}.
      
      Here is the aggregated top 10 data points:
      ${JSON.stringify(combinedData)}
      
      Summary Stats: The highest value is ${highest.category} (${highest.value}), the lowest of this group is ${lowest.category} (${lowest.value}), and the total sum of this group is ${total}.
      
      Write a brief, professional Executive Summary. Provide 3 specific bullet points of analytical takeaways or business recommendations based strictly on these numbers. 
      Format your response using basic HTML tags (like <b>, <br>, <ul>, <li>) so it renders cleanly in a web browser. Do not use Markdown markdown blocks like \`\`\`.
    `;

    // 3. Call the Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedInsight = response.text();
      
    // 4. Send the real insights back to the frontend
    res.json({ insights: generatedInsight.trim() });

  } catch (err) {
    console.error("AI Agent Error:", err);
    res.status(500).json({ error: 'Failed to generate insights from Gemini API.' });
  }
});

// Admin: Get Users (UC-05)
app.get('/admin/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).send('Admin only');
  try {
    const result = await pool.query('SELECT user_id, username, role FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create New User
app.post('/admin/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).send('Admin only');
  
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if username is already taken
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    // Insert directly into the password_hash column matching your setup
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
      [username.trim(), password, role]
    );

    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update Existing User Account
app.put('/admin/users/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).send('Admin only');
  
  const userId = req.params.id;
  const { username, password, role } = req.body;

  try {
    // 1. Build dynamic query depending on whether password was updated
    let query;
    let params;

    if (password && password.trim() !== "") {
      query = 'UPDATE users SET username = $1, password_hash = $2, role = $3 WHERE user_id = $4';
      params = [username.trim(), password, role, userId];
    } else {
      query = 'UPDATE users SET username = $1, role = $2 WHERE user_id = $3';
      params = [username.trim(), role, userId];
    }

    await pool.query(query, params);
    res.json({ message: 'User account updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Save RLS Rule (UC-05) - UPDATED FOR MULTIPLE COLUMNS
app.post('/admin/rls', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).send('Admin only');
  const { user_id, dataset_id, filter_columns } = req.body; // Expecting an array of columns

  if (!user_id || !dataset_id || !Array.isArray(filter_columns)) {
    return res.status(400).json({ error: 'Invalid payload structure.' });
  }

  try {
    // 1. Clear out old rules for this specific user/dataset combination first
    await pool.query(
      'DELETE FROM rls_rule WHERE user_id = $1 AND dataset_id = $2',
      [user_id, dataset_id]
    );

    // 2. Insert a new permission row for each selected column
    // Since 'filter_value' is removed, we'll insert a dummy value or leave it empty depending on your DB constraints
    for (const col of filter_columns) {
      await pool.query(
        'INSERT INTO rls_rule (user_id, dataset_id, filter_column, filter_value) VALUES ($1, $2, $3, $4)',
        [user_id, dataset_id, col, 'ALLOWED']
      );
    }

    res.status(201).json({ message: 'Permissions and columns updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW: Save a Custom Chart ---
// --- CORRECTED: Save a Custom Chart ---
app.post('/custom-charts', verifyToken, async (req, res) => {
  const { dataset_id, chart_type, title, x_axis_column, y_axis_column, filter_column, filter_value } = req.body;
  try {
    await pool.query(
      `INSERT INTO custom_charts (dataset_id, user_id, chart_type, title, x_axis_column, y_axis_column, filter_column, filter_value) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [dataset_id, req.user.user_id, chart_type, title, x_axis_column, y_axis_column, filter_value ? filter_column : null, filter_value || null]
    );
    res.status(201).json({ message: 'Chart pinned to dashboard!' });
  } catch (err) {
    console.error("Save Chart Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- NEW: Get Custom Charts for a Dataset ---
app.get('/custom-charts/:datasetId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM custom_charts WHERE dataset_id = $1 AND user_id = $2', 
      [req.params.datasetId, req.user.user_id]
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FETCH DATASET CONTENT (UPDATED FOR MULTI-COLUMN FILTERING) ---
app.get('/dataset-content/:id', verifyToken, async (req, res) => {
  const datasetId = req.params.id;
  
  try {
    // 1. Double check that the file entry exists in our system records
    const query = req.user.role === 'Admin' 
      ? 'SELECT * FROM datasets WHERE dataset_id = $1' 
      : 'SELECT * FROM datasets WHERE dataset_id = $1'; // Let the RLS validation layer handle access right below
    
    const dbResult = await pool.query(query, [datasetId]);
    if (dbResult.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });

    const datasetRecord = dbResult.rows[0];
    const filePath = datasetRecord.file_path;

    // 2. Lookup the allowed column permissions for this user from the RLS tables
    const rlsResult = await pool.query(
      'SELECT filter_column FROM rls_rule WHERE user_id = $1 AND dataset_id = $2',
      [req.user.user_id, datasetId]
    );
    
    const allowedColumns = rlsResult.rows.map(row => row.filter_column);

    // 3. Security Boundary: Standard users MUST have at least one allowed column to view it, 
    // unless they are the original owner who uploaded the file.
    const isOwner = datasetRecord.user_id === req.user.user_id;
    if (req.user.role !== 'Admin' && !isOwner && allowedColumns.length === 0) {
      return res.status(403).json({ error: 'Access denied. No active column permissions granted for this file.' });
    }

    // 4. Verify physical file persistence on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical file missing on server.' });
    }

    const results = [];
    const fileStream = fs.createReadStream(filePath);

    fileStream
      .pipe(csv())
      .on('data', (data) => {
         // If Admin or file owner, send the row entirely unmodified
         if (req.user.role === 'Admin' || isOwner) {
           results.push(data);
         } else {
           // Standard User: Scrub the object, keeping ONLY the keys explicitly checked by the Admin
           const scrubbedRow = {};
           allowedColumns.forEach(col => {
             if (data.hasOwnProperty(col)) {
               scrubbedRow[col] = data[col];
             }
           });
           results.push(scrubbedRow);
         }
      })
      .on('end', () => {
        res.json(results);
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Streaming error: ' + err.message });
      });

  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ error: "Server internal error" });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));