import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- SUB-COMPONENT: PERMISSION MANAGER (NEW) ---
function PermissionManager({ users, datasets, token }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [columnName, setColumnName] = useState('');
  const [filterValue, setFilterValue] = useState('');

  const handleSaveRule = async () => {
    if (!selectedUser || !selectedDataset) {
      alert("Please select both a user and a dataset.");
      return;
    }

    const rule = {
      user_id: selectedUser,
      dataset_id: selectedDataset,
      filter_column: columnName,
      filter_value: filterValue
    };

    try {
      await axios.post('http://localhost:5000/admin/rls', rule, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Data permissions updated successfully!");
    } catch (err) {
      alert("Failed to save rule: " + err.message);
    }
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginTop: '30px', border: '1px solid #ddd' }}>
      <h3>Row-Level Security (RLS) Manager</h3>
      <p style={{ fontSize: '14px', color: '#666' }}>Assign data filters to specific users to restrict what they see.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <select onChange={(e) => setSelectedUser(e.target.value)} style={{ padding: '8px' }}>
          <option value="">-- Select User --</option>
          {users.map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
        </select>

        <select onChange={(e) => setSelectedDataset(e.target.value)} style={{ padding: '8px' }}>
          <option value="">-- Select Dataset --</option>
          {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
        </select>

        <input 
          placeholder="Filter Column (e.g. region)" 
          value={columnName} 
          onChange={(e) => setColumnName(e.target.value)}
          style={{ padding: '8px' }} 
        />
        
        <input 
          placeholder="Filter Value (e.g. Kedah)" 
          value={filterValue} 
          onChange={(e) => setFilterValue(e.target.value)}
          style={{ padding: '8px' }} 
        />
      </div>

      <button 
        onClick={handleSaveRule}
        style={{ marginTop: '15px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Enforce Rule
      </button>
    </div>
  );
}

// --- MAIN COMPONENT: ADMIN PANEL ---
function AdminPanel({ token, role, datasets }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (role === 'Admin') {
      axios.get('http://localhost:5000/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setUsers(res.data))
        .catch(err => console.error(err));
    }
  }, [token, role]);

  if (role !== 'Admin') {
    return <p>Access Denied. You do not have administrator privileges.</p>;
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Admin Dashboard</h2>
      
      {/* User Table */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>Registered Users</h3>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{u.user_id}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission Manager Section */}
      <PermissionManager users={users} datasets={datasets} token={token} />
    </div>
  );
}

export default AdminPanel;