import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- SUB-COMPONENT: PERMISSION MANAGER (UPDATED) ---
function PermissionManager({ users, datasets, token }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [loadingCols, setLoadingCols] = useState(false);

  // Automatically parse and fetch available columns when a dataset is chosen
  useEffect(() => {
    if (!selectedDataset) {
      setAvailableColumns([]);
      setSelectedColumns([]);
      return;
    }

    const fetchColumns = async () => {
      setLoadingCols(true);
      try {
        // Fetch raw data rows from your existing content stream route to read headers
        const res = await axios.get(`https://pwn0nbjt-5000.asse.devtunnels.ms/dataset-content/${selectedDataset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.length > 0) {
          // Extract keys from the first row of data
          const columns = Object.keys(res.data[0]);
          setAvailableColumns(columns);
        } else {
          setAvailableColumns([]);
        }
      } catch (err) {
        console.error("Error reading dataset schema columns:", err);
        setAvailableColumns([]);
      } finally {
        setLoadingCols(false);
      }
    };

    fetchColumns();
    setSelectedColumns([]); // reset selection
  }, [selectedDataset, token]);

  const handleCheckboxChange = (columnName) => {
    if (selectedColumns.includes(columnName)) {
      setSelectedColumns(selectedColumns.filter(col => col !== columnName));
    } else {
      setSelectedColumns([...selectedColumns, columnName]);
    }
  };

  const handleSaveRule = async () => {
    if (!selectedUser || !selectedDataset) {
      alert("Please select both a user and a dataset.");
      return;
    }

    const payload = {
      user_id: parseInt(selectedUser, 10),
      dataset_id: parseInt(selectedDataset, 10),
      filter_columns: selectedColumns // Sending the array of checked columns
    };

    try {
      await axios.post('https://pwn0nbjt-5000.asse.devtunnels.ms/admin/rls', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Data permissions updated successfully! The user can now access this dataset.");
      setSelectedColumns([]);
    } catch (err) {
      alert("Failed to save permissions: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', marginTop: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e3e6f0' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#4e73df' }}>Dataset Column Access Control</h3>
      <p style={{ fontSize: '14px', color: '#858796', marginBottom: '20px' }}>Select a dataset and check all data columns this user is allowed to access.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Target User:</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            <option value="">-- Select User --</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.username} ({u.role})</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Target Dataset:</label>
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            <option value="">-- Select Dataset --</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
          </select>
        </div>
      </div>

      {/* DROP-DOWN STYLE COLUMN CHECKLIST COMPONENT */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
          Grant Column Permissions: {loadingCols && <span style={{ color: '#4e73df', fontSize: '12px' }}> (Loading options...)</span>}
        </label>
        
        {selectedDataset ? (
          <div style={{ 
            border: '1px solid #d1d3e2', 
            borderRadius: '4px', 
            padding: '12px', 
            maxHeight: '150px', 
            overflowY: 'auto',
            background: '#f8f9fc' 
          }}>
            {availableColumns.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#858796', fontStyle: 'italic' }}>No readable columns found in this file.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableColumns.map(col => (
                  <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#5a5c69' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedColumns.includes(col)}
                      onChange={() => handleCheckboxChange(col)}
                      style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                    />
                    {col}
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ border: '1px solid #d1d3e2', borderRadius: '4px', padding: '12px', background: '#eaecf4', color: '#858796', fontSize: '13px', fontStyle: 'italic' }}>
            Please select a target dataset from the dropdown above to look up available data columns.
          </div>
        )}
      </div>

      <button 
        onClick={handleSaveRule}
        style={{ padding: '12px 24px', background: '#1cc88a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Enforce Security Rule
      </button>
    </div>
  );
}

// --- MAIN COMPONENT: ADMIN PANEL ---
function AdminPanel({ token, role, datasets }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form States for creating a user
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('User');

  // Action Menu States
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null); // Holds user object currently being edited
  const menuRef = useRef();

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://pwn0nbjt-5000.asse.devtunnels.ms/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to retrieve system user list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'Admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [token, role]);

  // Close 3-dot menus on outside mouse clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeMenuUserId && menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuUserId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuUserId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      alert("Please fill out username and password fields.");
      return;
    }

    try {
      await axios.post('https://pwn0nbjt-5000.asse.devtunnels.ms/admin/users', {
        username: newUsername,
        password: newPassword,
        role: newRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("New account profile registered successfully!");
      setNewUsername('');
      setNewPassword('');
      setNewRole('User');
      fetchUsers(); // Refresh layout
    } catch (err) {
      alert("Registration error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser.username) {
      alert("Username handle cannot be blank.");
      return;
    }

    try {
      await axios.put(`https://pwn0nbjt-5000.asse.devtunnels.ms/admin/users/${editingUser.user_id}`, {
        username: editingUser.username,
        role: editingUser.role,
        password: editingUser.password || "" // optional password update field
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("User parameters adjusted successfully!");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert("Failed to modify record: " + (err.response?.data?.error || err.message));
    }
  };

  if (role !== 'Admin') {
    return (
      <div style={{ padding: '30px', background: '#ffebee', color: '#c62828', borderRadius: '8px', border: '1px solid #ef9a9a', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>🚨 Access Denied</h3>
        <p style={{ margin: 0 }}>You do not possess the administrator privileges required to access this system panel.</p>
      </div>
    );
  }

  if (loading) return <p style={{ color: '#4e73df', fontWeight: 'bold' }}>Loading system user data...</p>;

  return (
    <div style={{ marginTop: '10px' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Admin Dashboard Panel</h2>
      
      {error && <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', marginBottom: '15px', borderRadius: '4px' }}>{error}</div>}

      {/* SECTION 1: CREATE NEW USER FORM */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e3e6f0' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#4e73df' }}>Provision New User Account</h3>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Username:</label>
            <input 
              type="text" 
              placeholder="e.g. janesmith" 
              value={newUsername} 
              onChange={e => setNewUsername(e.target.value)}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d3e2', width: '200px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Password:</label>
            <input 
              type="password" 
              placeholder="Assign password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d3e2', width: '200px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>System Role:</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d3e2', width: '150px' }}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '11px 20px', background: '#4e73df', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Create User
          </button>
        </form>
      </div>

      {/* SECTION 2: REGISTERED USERS MATRIX */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e3e6f0' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#4e73df' }}>Registered Users Matrix</h3>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e3e6f0', background: '#f8f9fc', color: '#4e73df' }}>
              <th style={{ padding: '12px 15px' }}>User ID</th>
              <th style={{ padding: '12px 15px' }}>Username Handle</th>
              <th style={{ padding: '12px 15px' }}>Assigned System Role</th>
              <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => {
              const isEditing = editingUser && editingUser.user_id === u.user_id;
              
              return (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #e3e6f0', backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fc' }}>
                  <td style={{ padding: '12px 15px', color: '#5a5c69', fontWeight: 'bold' }}>{u.user_id}</td>
                  
                  {/* Inline Form Toggle Field Logic */}
                  <td style={{ padding: '12px 15px' }}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editingUser.username}
                        onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #4e73df' }}
                      />
                    ) : (
                      <span style={{ color: '#5a5c69' }}>{u.username}</span>
                    )}
                  </td>
                  
                  <td style={{ padding: '12px 15px' }}>
                    {isEditing ? (
                      <select 
                        value={editingUser.role} 
                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #4e73df' }}
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    ) : (
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '30px', fontSize: '12px', fontWeight: 'bold',
                        background: u.role === 'Admin' ? '#edf2ff' : '#eaecf4',
                        color: u.role === 'Admin' ? '#4e73df' : '#5a5c69'
                      }}>
                        {u.role}
                      </span>
                    )}
                    {isEditing && (
                      <input 
                        type="password" 
                        placeholder="New Password (or blank)" 
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #4e73df', marginLeft: '10px', width: '160px' }}
                      />
                    )}
                  </td>

                  {/* Actions Column with 3-Dot Dropdown */}
                  <td style={{ padding: '12px 15px', textAlign: 'right', position: 'relative' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={handleUpdateUser} style={{ padding: '6px 12px', background: '#1cc88a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Save</button>
                        <button onClick={() => setEditingUser(null)} style={{ padding: '6px 12px', background: '#858796', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <button 
                          onClick={() => setActiveMenuUserId(activeMenuUserId === u.user_id ? null : u.user_id)}
                          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#858796', padding: '0 10px', fontWeight: 'bold' }}
                        >
                          ⋮
                        </button>
                        
                        {activeMenuUserId === u.user_id && (
                          <div ref={menuRef} style={{
                            position: 'absolute', right: '15px', top: '35px', background: 'white', border: '1px solid #d1d3e2',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '4px', zIndex: 10, width: '100px', textAlign: 'center'
                          }}>
                            <button 
                              onClick={() => {
                                setEditingUser({ ...u, password: '' });
                                setActiveMenuUserId(null);
                              }}
                              style={{ width: '100%', background: 'none', border: 'none', padding: '10px', cursor: 'pointer', fontSize: '14px', color: '#4e73df', textAlign: 'left' }}
                              onMouseEnter={(e) => e.target.style.background = '#f8f9fc'}
                              onMouseLeave={(e) => e.target.style.background = 'none'}
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permission Manager Section */}
      <PermissionManager users={users} datasets={datasets} token={token} />
    </div>
  );
}

export default AdminPanel;