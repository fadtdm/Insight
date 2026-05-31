import React, { useState, useRef } from 'react';
import axios from 'axios';

function UploadData({ token, fetchDashboardData }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- HTML5 Drag and Drop Event Listeners ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setStatusMessage('');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // File validation logic (Checks for .csv datasets)
      if (droppedFile.name.endsWith('.csv')) {
        setSelectedFile(droppedFile);
      } else {
        setStatusMessage('❌ Invalid file type. Please drop a valid CSV dataset file.');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStatusMessage('');
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current.click();
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    setIsUploading(true);
    setStatusMessage('Uploading dataset...');

    try {
      await axios.post('https://pwn0nbjt-5000.asse.devtunnels.ms/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      setStatusMessage('✅ Dataset uploaded successfully!');
      setSelectedFile(null);

      // 👉 Sync state immediately with the parent layout state
      if (fetchDashboardData) {
        await fetchDashboardData(token);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(err.response?.data || '❌ Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2 style={{ marginBottom: '10px', color: '#1e293b' }}>Upload Business Data</h2>
      <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '15px' }}>
        Upload your raw SME dataset files here to generate dashboards and insights.
      </p>

      {/* DRAG ZONE TARGET CONTAINER */}
      <div 
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFilePicker}
      >
        {/* Hidden Native File Input Element */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".csv" 
          style={{ display: 'none' }} 
        />

        <div className="upload-icon">☁️</div>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#334155' }}>
          Drag & drop your CSV file here
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
          or click to browse local files
        </p>
      </div>

      {/* Selected File Badge */}
      {selectedFile && (
        <div className="file-pill">
          <span>📄 {selectedFile.name}</span>
          <span 
            style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px', color: '#94a3b8' }}
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
          >
            ✕
          </span>
        </div>
      )}

      {/* Status Output Messaging Layout */}
      {statusMessage && (
        <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: '500', color: statusMessage.includes('❌') ? '#ef4444' : '#10b981' }}>
          {statusMessage}
        </div>
      )}

      {/* Execution Actions Button */}
      {selectedFile && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleUploadSubmit} 
            disabled={isUploading}
            className="upload-button"
          >
            {isUploading ? 'Uploading...' : 'Confirm and Upload'}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadData;