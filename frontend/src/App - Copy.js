import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import DashboardDesigner from './components/DashboardDesigner';

// Component Imports
import DashboardOverview from './components/DashboardOverview';
import UploadData from './components/UploadData';
import AdminPanel from './components/AdminPanel';
import DesignDashboard from './components/DesignDashboard';
import Analytics from './components/Analytics';

function App() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/login', { username, password });
      setToken(res.data.token);
      setRole(res.data.role);
      fetchDashboardData(res.data.token);
    } catch (err) {
      alert("Login failed. Check your credentials.");
    }
  };

  const fetchDashboardData = async (activeToken) => {
    try {
      const res = await axios.get('http://localhost:5000/dashboard-data', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setDatasets(res.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f9' }}>
        <div style={{ padding: '40px', width: '350px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', color: '#4e73df', marginBottom: '30px' }}>BI Dashboard Tool</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#4e73df', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Sidebar link styles
  const linkStyle = { color: '#fff', textDecoration: 'none', display: 'block', padding: '10px', borderRadius: '4px', marginBottom: '5px' };

  return (
    <Router>
      <div style={{ display: 'flex', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: '#f8f9fc', minHeight: '100vh' }}>
        {/* Sidebar Navigation */}
        <div style={{ width: '250px', background: '#4e73df', padding: '20px', color: '#fff' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '15px', marginBottom: '20px' }}>
            SME Analytics
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'inline-block', textAlign: 'left' }}>
            <li><Link to="/" style={linkStyle}> Dashboard</Link></li>
            <li><Link to="/upload" style={linkStyle}> Data Upload</Link></li>
            <li><Link to="/analytics" style={linkStyle}> Analytics & Insights</Link></li>
            <li><Link to="/designer" style={linkStyle}> Dashboard Designer</Link></li>
            {role === 'Admin' && <li><Link to="/admin" style={linkStyle}> User Management</Link></li>}
          </ul>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<DashboardOverview datasets={datasets} token={token} />} />
            <Route path="/upload" element={<UploadData token={token} />} />
            <Route path="/analytics" element={<Analytics datasets={datasets} token={token} />} />
            <Route path="/design" element={<DesignDashboard datasets={datasets} />} />
            <Route path="/admin" element={<AdminPanel token={token} role={role} datasets={datasets} />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/designer" element={<DashboardDesigner datasets={datasets} token={token} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;