import React, { useState } from 'react';
import axios from 'axios';

function UploadData({ token }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return setStatus('Please select a file first.');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus('Uploading...');
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus(`Success! Uploaded ${file.name}.`);
    } catch (error) {
      setStatus('Upload failed.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px dashed #ccc', marginTop: '20px' }}>
      <h2>Data Management</h2>
      <p>Upload new CSV datasets for analysis.</p>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginLeft: '10px', padding: '5px 15px', background: '#007bff', color: 'white', border: 'none' }}>
        Upload Dataset
      </button>
      <p><b>{status}</b></p>
    </div>
  );
}

export default UploadData;