import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

function Dashboard({ datasets, token }) {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [rawData, setRawData] = useState([]);
  const [customCharts, setCustomCharts] = useState([]);
  const [message, setMessage] = useState('');

  // 1. Fetch Data
  useEffect(() => {
    if (!selectedDataset) {
      setRawData([]); setCustomCharts([]); return;
    }
    const fetchDashboardData = async () => {
      try {
        const dataRes = await axios.get(`http://localhost:5000/dataset-content/${selectedDataset}`, { headers: { Authorization: `Bearer ${token}` } });
        setRawData(dataRes.data);
        const chartRes = await axios.get(`http://localhost:5000/custom-charts/${selectedDataset}`, { headers: { Authorization: `Bearer ${token}` } });
        setCustomCharts(chartRes.data);
      } catch (err) {
        setMessage("Failed to load dashboard data.");
      }
    };
    fetchDashboardData();
  }, [selectedDataset, token]);

  // --- BULLETPROOF MATH FILTER LOGIC ---
  const matchesFilter = (row, filterCol, filterVal) => {
    if (!filterCol || !filterVal) return true;
    
    const rawCell = row[filterCol];
    if (rawCell === undefined || rawCell === null) return false;
    
    const cellStr = String(rawCell).trim();
    const cellNum = parseFloat(cellStr.replace(/[^0-9.-]+/g, ""));
    const query = String(filterVal).trim().toLowerCase();

    // 1. Inequalities (Catches: >9800, <9800, >=9800, =>9800)
    const matchIneq = query.match(/^(>=|<=|=>|=<|>|<)\s*([\d.-]+)$/);
    if (matchIneq) {
        const operator = matchIneq[1];
        const target = parseFloat(matchIneq[2]);
        if (isNaN(cellNum) || isNaN(target)) return false;
        
        if (operator === '>=' || operator === '=>') return cellNum >= target;
        if (operator === '<=' || operator === '=<') return cellNum <= target;
        if (operator === '>') return cellNum > target;
        if (operator === '<') return cellNum < target;
    }

    // 2. Range (Catches: 8500-9800 or 8500 - 9800)
    const matchRange = query.match(/^([\d.-]+)\s*-\s*([\d.-]+)$/);
    if (matchRange) {
        const min = parseFloat(matchRange[1]);
        const max = parseFloat(matchRange[2]);
        if (!isNaN(min) && !isNaN(max) && !isNaN(cellNum)) {
            return cellNum >= min && cellNum <= max;
        }
    }

    // 3. Comma List (Catches: 8500, 9800)
    if (query.includes(',')) {
       const allowed = query.split(',').map(q => q.trim());
       return allowed.includes(cellStr.toLowerCase()) || allowed.includes(String(cellNum));
    }

    // 4. Exact Match
    return cellStr.toLowerCase() === query || cellNum === parseFloat(query);
  };

  // --- DEFAULT CHART LOGIC ---
  let defaultLabels = [];
  let defaultValueData = [];
  let defaultColName = '';
  let kpiTotal = 0;

  if (rawData.length > 0) {
    const keys = Object.keys(rawData[0]).map(k => k.trim());
    // Guess value and label columns
    // Find columns that actually exist in our restricted row dataset
    const valueKey = keys.find(k => rawData[0][k] !== undefined && !isNaN(parseFloat(String(rawData[0][k]).replace(/[^0-9.-]+/g, "")))) || keys[0] || 'Value';
    const labelKey = keys.find(k => k !== valueKey && rawData[0][k] !== undefined) || keys[0] || 'Label';
    defaultColName = valueKey;

    const aggregated = {};
    rawData.forEach(row => {
      const label = row[labelKey] || 'Unknown';
      const val = parseFloat(String(row[valueKey]).replace(/[^0-9.-]+/g, "")) || 0;
      aggregated[label] = (aggregated[label] || 0) + val;
      kpiTotal += val;
    });
    defaultLabels = Object.keys(aggregated);
    defaultValueData = Object.values(aggregated);
  }

  const defaultChartConfig = {
    labels: defaultLabels,
    datasets: [{ data: defaultValueData, backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'] }]
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Main Dashboard</h2>
      {message && <div style={{ padding: '15px', background: '#ffebee', color: '#c62828', marginBottom: '15px' }}>{message}</div>}

      {/* Dataset Selector */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '15px' }}>Select Dataset:</label>
        <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={{ padding: '10px', width: '300px', borderRadius: '5px' }}>
          <option value="">-- Choose a Dataset --</option>
          {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
        </select>
      </div>

      {selectedDataset && rawData.length > 0 ? (
        <div>
          {/* SECTION 1: DEFAULT CHARTS OVERVIEW */}
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Dataset Overview</h3>
          
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft: '4px solid #4e73df', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>Total {defaultColName}</h4>
            <h2 style={{ margin: '0', color: '#333' }}>{kpiTotal.toLocaleString()}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', height: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '10px' }}>{defaultColName} Distribution</h4>
              <Bar data={defaultChartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', height: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '10px' }}>{defaultColName} Share</h4>
              <Pie data={defaultChartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>

          {/* SECTION 2: CUSTOM PINNED CHARTS */}
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Your Pinned Charts</h3>
          {customCharts.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No custom charts pinned yet. Use the Dashboard Designer to build some!</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {customCharts.map(chart => {
                const activeData = rawData.filter(row => matchesFilter(row, chart.filter_column, chart.filter_value));
                const aggregated = {};
                activeData.forEach(row => {
                  const label = row[chart.x_axis_column] || 'Unknown';
                  const val = parseFloat(String(row[chart.y_axis_column]).replace(/[^0-9.-]+/g, "")) || 0;
                  aggregated[label] = (aggregated[label] || 0) + val;
                });

                const chartConfig = {
                  labels: Object.keys(aggregated),
                  datasets: [{ data: Object.values(aggregated), backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'] }]
                };

                return (
                  <div key={chart.chart_id} style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>{chart.title}</h4>
                    <div style={{ height: '300px' }}>
                      {chart.chart_type === 'bar' && <Bar data={chartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } }} />}
                      {chart.chart_type === 'line' && <Line data={chartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } }} />}
                      {chart.chart_type === 'pie' && <Pie data={chartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } }} />}
                      {chart.chart_type === 'doughnut' && <Doughnut data={chartConfig} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } } }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        selectedDataset && <p>Loading your data...</p>
      )}
    </div>
  );
}

export default Dashboard;