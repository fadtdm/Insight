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

// Login (UC-01)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
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

// Dashboard Data with RLS (UC-06)
app.get('/dashboard-data', verifyToken, async (req, res) => {
  try {
    // If Admin, see everything. If User, only see their own uploads.
    const query = req.user.role === 'Admin' 
      ? 'SELECT * FROM datasets' 
      : 'SELECT * FROM datasets WHERE user_id = $1';
    const params = req.user.role === 'Admin' ? [] : [req.user.user_id];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// Admin: Save RLS Rule (UC-05)
app.post('/admin/rls', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).send('Admin only');
  const { user_id, dataset_id, filter_column, filter_value } = req.body;
  try {
    // FIX: Using "rls_rule" (singular)
    await pool.query(
      'INSERT INTO rls_rule (user_id, dataset_id, filter_column, filter_value) VALUES ($1, $2, $3, $4)',
      [user_id, dataset_id, filter_column, filter_value]
    );
    res.status(201).json({ message: 'Rule saved' });
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

// --- NEW: Fetch Actual Dataset Content (with RLS Filtering) ---
// --- CORRECTED: Fetch Actual Dataset Content ---
app.get('/dataset-content/:id', verifyToken, async (req, res) => {
  const datasetId = req.params.id;
  
  try {
    // 1. Get the dataset path
    const query = req.user.role === 'Admin' 
      ? 'SELECT * FROM datasets WHERE dataset_id = $1' 
      : 'SELECT * FROM datasets WHERE dataset_id = $1 AND user_id = $2';
    const params = req.user.role === 'Admin' ? [datasetId] : [datasetId, req.user.user_id];
    
    const dbResult = await pool.query(query, params);
    if (dbResult.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });

    const filePath = dbResult.rows[0].file_path;

    // 2. Get the security rules (singular table name: rls_rule)
    const rlsResult = await pool.query(
      'SELECT filter_column, filter_value FROM rls_rule WHERE user_id = $1 AND dataset_id = $2',
      [req.user.user_id, datasetId]
    );
    const activeRules = rlsResult.rows; // This is the variable that was missing!

    const results = [];
    
    // 3. Create the stream and handle missing files
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Physical file missing on server. Please re-upload.' });
    }

    const fileStream = fs.createReadStream(filePath);

    fileStream
      .pipe(csv())
      .on('data', (data) => {
         let isAllowed = true;
         
         // Apply rules using the correctly scoped activeRules
         activeRules.forEach(rule => {
            if (data[rule.filter_column] && data[rule.filter_column] !== rule.filter_value) {
               isAllowed = false;
            }
         });

         if (isAllowed) results.push(data);
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