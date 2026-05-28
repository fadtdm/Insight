import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'chart.js/auto';

function DashboardOverview({ datasets, token }) {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [rawData, setRawData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // Layout Management State
  const [isEditing, setIsEditing] = useState(false);
  const [kpiColumn, setKpiColumn] = useState('');
  const [chartsConfig, setChartsConfig] = useState([]);

  // 1. Session Persistence: Load the last active dataset on mount
  useEffect(() => {
    const savedDataset = localStorage.getItem('sme_last_dataset');
    if (savedDataset && datasets.some(d => d.dataset_id.toString() === savedDataset)) {
      setSelectedDataset(savedDataset);
    } else if (datasets.length > 0) {
      setSelectedDataset(datasets[0].dataset_id.toString());
    }
  }, [datasets]);

  // 2. Load preferences and layout configuration when the selection updates
  useEffect(() => {
    if (!selectedDataset) return;
    
    // Save to local storage so it remembers this dataset upon their next login
    localStorage.setItem('sme_last_dataset', selectedDataset);

    const fetchDataset = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/dataset-content/${selectedDataset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = res.data;
        if (data && data.length > 0) {
          setRawData(data);
          const cols = Object.keys(data[0]);
          setAvailableColumns(cols);

          // Retrieve custom UI state for this specific dataset if it exists
          const savedConfig = localStorage.getItem(`sme_config_${selectedDataset}`);
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            setKpiColumn(parsed.kpiColumn);
            setChartsConfig(parsed.chartsConfig);
          } else {
            // Default Fallback configuration
            const numericCol = cols.find(c => !isNaN(parseFloat(data[0][c]))) || cols[1];
            setKpiColumn(numericCol);
            setChartsConfig([
              { id: Date.now(), type: 'Bar', xAxis: cols[0], yAxis: numericCol },
              { id: Date.now() + 1, type: 'Pie', xAxis: cols[0], yAxis: numericCol }
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load data details:", err);
      }
    };
    fetchDataset();
  }, [selectedDataset, token]);

  // 3. Save Custom Dashboard Changes
  const saveConfiguration = () => {
    const config = { kpiColumn, chartsConfig };
    localStorage.setItem(`sme_config_${selectedDataset}`, JSON.stringify(config));
    setIsEditing(false);
  };

  // 4. Data Transformer Helper
  const aggregateData = (xCol, yCol) => {
    const aggregated = {};
    rawData.forEach(row => {
      const xVal = row[xCol] || 'Unknown';
      const yVal = parseFloat(String(row[yCol]).replace(/[^0-9.-]+/g, "")) || 0;
      if (!aggregated[xVal]) aggregated[xVal] = 0;
      aggregated[xVal] += yVal;
    });
    return { labels: Object.keys(aggregated), values: Object.values(aggregated) };
  };

  // 5. Calculate Custom KPI Overview Value
  const kpiTotal = rawData.reduce((sum, row) => {
    return sum + (parseFloat(String(row[kpiColumn]).replace(/[^0-9.-]+/g, "")) || 0);
  }, 0);

  // 6. Dynamic Chart Generation
  const renderChart = (chart) => {
    const { labels, values } = aggregateData(chart.xAxis, chart.yAxis);
    
    // COLOR MANIPULATION: Enforce explicit unison blue theme for Bar charts 
    const isBar = chart.type === 'Bar';
    const bgColors = isBar 
      ? '#4e73df' 
      : ['#FF6384', '#36A2EB', '#FFCE56', '#1cc88a', '#f6c23e', '#e74a3b', '#858796', '#343a40'];

    const dataPayload = {
      labels,
      datasets: [{
        label: `${chart.yAxis} broken down by ${chart.xAxis}`,
        data: values,
        backgroundColor: bgColors,
        borderColor: isBar ? '#4e73df' : '#fff',
        borderWidth: 1
      }]
    };

    const options = { 
      responsive: true, 
      plugins: { 
        legend: { display: !isBar } // Hides the single-item legend box for bar graphs
      } 
    };

    return (
      <div key={chart.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e3e6f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#4e73df' }}>{chart.yAxis} vs {chart.xAxis} ({chart.type})</h4>
        {chart.type === 'Bar' && <Bar data={dataPayload} options={options} />}
        {chart.type === 'Pie' && <Pie data={dataPayload} options={options} />}
        {chart.type === 'Line' && <Line data={dataPayload} options={options} />}
        
        {isEditing && (
          <button onClick={() => setChartsConfig(chartsConfig.filter(c => c.id !== chart.id))} style={{ marginTop: '10px', background: '#e74a3b', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>
            Delete Chart
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* MANAGEMENT & UTILITY CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0 }}>Business Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            <option value="">-- Select Dataset --</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
          </select>
          <button onClick={() => isEditing ? saveConfiguration() : setIsEditing(true)} style={{ padding: '8px 16px', background: isEditing ? '#1cc88a' : '#f6c23e', color: isEditing ? 'white' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isEditing ? '💾 Save Custom Setup' : '⚙️ Build Dashboard Layout'}
          </button>
        </div>
      </div>

      {/* DASHBOARD BUILDER CONFIGURATION DRAWER */}
      {isEditing && (
        <div style={{ background: '#f8f9fc', padding: '20px', borderRadius: '8px', border: '1px dashed #4e73df', marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#4e73df' }}>Interactive Widget Configurator</h3>
          
          {/* Target KPI Aggregation Dropdown */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Select column for overview total calculations:</label>
            <select value={kpiColumn} onChange={(e) => setKpiColumn(e.target.value)} style={{ padding: '6px' }}>
              {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          {/* New Interactive Metrics Insertion Form */}
          <div style={{ padding: '15px', background: '#fff', border: '1px solid #d1d3e2', borderRadius: '4px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Add Chart Module:</strong>
            <select id="newType" style={{ padding: '6px' }}><option value="Bar">Bar Chart</option><option value="Pie">Pie Chart</option><option value="Line">Line Chart</option></select>
            <select id="newX" style={{ padding: '6px' }}>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select>
            <select id="newY" style={{ padding: '6px' }}>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select>
            <button 
              onClick={() => {
                const type = document.getElementById('newType').value;
                const xAxis = document.getElementById('newX').value;
                const yAxis = document.getElementById('newY').value;
                setChartsConfig([...chartsConfig, { id: Date.now(), type, xAxis, yAxis }]);
              }}
              style={{ padding: '6px 12px', background: '#4e73df', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Add Component
            </button>
          </div>
        </div>
      )}

      {/* PERSISTENT GENERAL KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #4e73df', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#858796', fontSize: '14px', textTransform: 'uppercase' }}>Sum Total ({kpiColumn})</h4>
          <h2 style={{ margin: 0, color: '#5a5c69' }}>{kpiTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #1cc88a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#858796', fontSize: '14px', textTransform: 'uppercase' }}>Total Data Set Rows</h4>
          <h2 style={{ margin: 0, color: '#5a5c69' }}>{rawData.length}</h2>
        </div>
      </div>

      {/* MULTI-CHART GRID MATRIX */}
      {chartsConfig.length === 0 ? (
        <p style={{ color: '#858796', fontStyle: 'italic' }}>No active layout rules configured yet. Click 'Build Dashboard Layout' above to construct your layout modules.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
          {chartsConfig.map(chart => renderChart(chart))}
        </div>
      )}
    </div>
  );
}

export default DashboardOverview;