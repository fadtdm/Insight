import React, { useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';

function DesignDashboard({ datasets }) {
  const [visuals, setVisuals] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [chartType, setChartType] = useState('Bar');

  // Simulated data extraction for prototype purposes
  const getDummyData = () => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Dataset Value',
      data: [Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
    }]
  });

  const addVisual = () => {
    if (!selectedDataset) return alert("Select a dataset first!");
    const newVisual = {
      id: Date.now(),
      title: `${chartType} Chart - ${selectedDataset}`,
      type: chartType,
      data: getDummyData()
    };
    setVisuals([...visuals, newVisual]);
  };

  const removeVisual = (id) => {
    setVisuals(visuals.filter(v => v.id !== id));
  };

  const renderChart = (visual) => {
    switch (visual.type) {
      case 'Line': return <Line data={visual.data} />;
      case 'Pie': return <Pie data={visual.data} />;
      default: return <Bar data={visual.data} />;
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Dashboard Designer</h2>
      <p>Create custom visualizations by selecting a dataset and chart type.</p>
      
      {/* Control Panel */}
      <div style={{ padding: '15px', background: '#e9ecef', borderRadius: '5px', marginBottom: '20px' }}>
        <select onChange={(e) => setSelectedDataset(e.target.value)} value={selectedDataset} style={{ marginRight: '10px', padding: '5px' }}>
          <option value="">-- Select Dataset --</option>
          {datasets.map(d => (
            <option key={d.dataset_id} value={d.file_name}>{d.file_name}</option>
          ))}
        </select>

        <select onChange={(e) => setChartType(e.target.value)} value={chartType} style={{ marginRight: '10px', padding: '5px' }}>
          <option value="Bar">Bar Chart</option>
          <option value="Line">Line Chart</option>
          <option value="Pie">Pie Chart</option>
        </select>

        <button onClick={addVisual} style={{ padding: '6px 15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
          Add Component
        </button>
      </div>

      {/* Canvas Area */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {visuals.map(visual => (
          <div key={visual.id} style={{ width: '400px', border: '1px solid #ddd', padding: '15px', borderRadius: '5px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>{visual.title}</strong>
              <button onClick={() => removeVisual(visual.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
            </div>
            {renderChart(visual)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DesignDashboard;