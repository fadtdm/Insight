import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken, setRole, fetchDashboardData }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

// Add setUsername to the destructured props at the top:
// function Login({ setToken, setRole, setUsername, fetchDashboardData }) {

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('https://pwn0nbjt-5000.asse.devtunnels.ms/login', { 
        username: username.trim(), 
        password: password.trim() 
      });
      
      // 1. Save to LocalStorage to survive refreshes
      localStorage.setItem('sme_token', res.data.token);
      localStorage.setItem('sme_role', res.data.role);
      localStorage.setItem('sme_username', username.trim());
      
      // 2. Update React State
      setToken(res.data.token);
      setRole(res.data.role);
      setUsername(username.trim()); // Push username up to App.js
      
      await fetchDashboardData(res.data.token);
      navigate('/');
      
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <div style={{ padding: '40px', width: '350px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e3e6f0' }}>
        <h2 style={{ textAlign: 'center', color: '#4e73df', margin: '0 0 10px 0' }}>SME Analytics</h2>
        <p style={{ textAlign: 'center', color: '#858796', marginBottom: '30px', fontSize: '14px' }}>Sign in to your dashboard</p>
        
        {error && (
          <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#5a5c69' }}>Username</label>
            <input 
              type="text" 
              placeholder="Enter username..." 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d3e2', boxSizing: 'border-box' }} 
              required
            />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#5a5c69' }}>Password</label>
            <input 
              type="password" 
              placeholder="Enter password..." 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d3e2', boxSizing: 'border-box' }} 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ width: '100%', padding: '12px', background: '#4e73df', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;