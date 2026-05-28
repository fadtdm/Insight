import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Component Imports
import Login from './components/Login';
import DashboardOverview from './components/DashboardOverview';
import UploadData from './components/UploadData';
import AdminPanel from './components/AdminPanel';
import DesignDashboard from './components/DesignDashboard';
import Analytics from './components/Analytics';
import DashboardDesigner from './components/DashboardDesigner';

function MainApp() {
  const [token, setToken] = useState(localStorage.getItem('sme_token') || null);
  const [role, setRole] = useState(localStorage.getItem('sme_role') || null);
  const [username, setUsername] = useState(localStorage.getItem('sme_username') || '');
  const [datasets, setDatasets] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const location = useLocation(); // Hook to determine our active route pathing

  useEffect(() => {
    if (token) {
      fetchDashboardData(token);
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async (activeToken) => {
    try {
      const res = await axios.get('http://localhost:5000/dashboard-data', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setDatasets(res.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      if (err.response && err.response.status === 403) handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sme_token');
    localStorage.removeItem('sme_role');
    localStorage.removeItem('sme_username');
    setToken(null);
    setRole(null);
    setUsername('');
    setDropdownOpen(false);
  };

  if (!token) {
    return (
      <Routes>
        {/* Added setUsername prop below to solve the instant header name display delay */}
        <Route path="*" element={<Login setToken={setToken} setRole={setRole} setUsername={setUsername} fetchDashboardData={fetchDashboardData} />} />
      </Routes>
    );
  }

  // Helper utility to evaluate whether a menu bar link is currently active
  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-container">
      {/* TOP NAVIGATION BAR */}
      <header className="topbar">
        <div className="brand">
          <span style={{ fontSize: '24px' }}>📊</span> SME Insight
        </div>

        {/* Horizontal Navigation Menu */}
        <nav>
          <ul className="nav-menu">
            <li><Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Dashboard</Link></li>
            <li><Link to="/upload" className={`nav-link ${isActive('/upload') ? 'active' : ''}`}>Data Upload</Link></li>
            <li><Link to="/analytics" className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}>AI Analytics</Link></li>
            <li><Link to="/designer" className={`nav-link ${isActive('/designer') ? 'active' : ''}`}>Dashboard Designer</Link></li>
            {role === 'Admin' && <li><Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>User Management</Link></li>}
          </ul>
        </nav>

        {/* User Profile Dropdown */}
        <div className="profile-container" ref={dropdownRef}>
          <button className="profile-button" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="avatar">{username ? username.charAt(0).toUpperCase() : 'U'}</div>
            <span>{username || 'User'}</span>
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>▼</span>
          </button>
          
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={handleLogout} className="dropdown-item">Log out</button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardOverview datasets={datasets} token={token} />} />
          {/* Added fetchDashboardData prop below to solve the dashboard dataset delay */}
          <Route path="/upload" element={<UploadData token={token} fetchDashboardData={fetchDashboardData} />} />
          <Route path="/analytics" element={<Analytics datasets={datasets} token={token} />} />
          <Route path="/design" element={<DesignDashboard datasets={datasets} />} />
          <Route path="/admin" element={<AdminPanel token={token} role={role} datasets={datasets} />} />
          <Route path="/designer" element={<DashboardDesigner datasets={datasets} token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}