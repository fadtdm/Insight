import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

function DashboardDesigner({ datasets, token }) {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [rawData, setRawData] = useState([]);
  const [columns, setColumns] = useState([]);

  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [filterCol, setFilterCol] = useState('');
  const [filterVal, setFilterVal] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [message, setMessage] = useState('');

  // 1. Fetch Dataset
  useEffect(() => {
    if (!selectedDataset) return;
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/dataset-content/${selectedDataset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRawData(res.data);
        if (res.data.length > 0) setColumns(Object.keys(res.data[0]).map(k => k.trim()));
      } catch (err) {
        setMessage('Error loading dataset.');
      }
    };
    fetchData();
  }, [selectedDataset, token]);

  // 2. Generate Preview & Run the Smart Filter
  useEffect(() => {
    if (!rawData.length || !xAxis || !yAxis) return;

    let activeData = rawData;

    if (filterCol && filterVal) {
      activeData = rawData.filter(row => {
        const rawCell = row[filterCol];
        if (rawCell === undefined || rawCell === null) return false;
        
        const cellStr = String(rawCell).trim();
        const cellNum = parseFloat(cellStr.replace(/[^0-9.-]+/g, ""));
        const query = filterVal.trim().toLowerCase();

        // --- THIS IS THE UPDATED RANGE FILTER LOGIC ---
        if (query.includes('-') && !query.startsWith('-')) {
           const parts = query.split('-');
           const min = parseFloat(parts[0].trim());
           const max = parseFloat(parts[1].trim());
           
           // This console.log will print to your F12 tools so we can see what is breaking
           console.log(`Checking cell: "${cellStr}" | Parsed Num: ${cellNum} | Min: ${min} | Max: ${max}`);
           
           if (!isNaN(min) && !isNaN(max) && !isNaN(cellNum)) {
               return cellNum >= min && cellNum <= max;
           }
        }

        // Comma list (e.g. 150, 420, 110)
        if (query.includes(',')) {
           const allowed = query.split(',').map(q => q.trim());
           return allowed.includes(cellStr.toLowerCase());
        }

        // Greater/Less than
        if (query.startsWith('>')) return !isNaN(cellNum) && cellNum > parseFloat(query.substring(1));
        if (query.startsWith('<')) return !isNaN(cellNum) && cellNum < parseFloat(query.substring(1));

        // Exact match fallback
        return cellStr.toLowerCase() === query;
      });
    }

    const aggregated = {};
    activeData.forEach(row => {
      const label = row[xAxis] || 'Unknown';
      const val = parseFloat(String(row[yAxis]).replace(/[^0-9.-]+/g, "")) || 0;
      aggregated[label] = (aggregated[label] || 0) + val;
    });

    setPreviewData({ labels: Object.keys(aggregated), values: Object.values(aggregated) });
  }, [rawData, xAxis, yAxis, filterCol, filterVal]);

  // 3. Save to Database
  const handleSaveChart = async () => {
    if (!title || !xAxis || !yAxis) return setMessage("Title, X-Axis, and Y-Axis are required.");
    try {
      await axios.post('http://localhost:5000/custom-charts', {
        dataset_id: selectedDataset, chart_type: chartType, title: title,
        x_axis_column: xAxis, y_axis_column: yAxis,
        filter_column: filterCol, filter_value: filterVal
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage("Chart successfully saved! Check your main dashboard.");
    } catch (err) {
      setMessage("Failed to save chart: " + (err.response?.data?.error || err.message));
    }
  };

  // 4. Render the Chart Preview
  const renderChart = () => {
    if (!previewData || previewData.labels.length === 0) return <p>No data to preview.</p>;
    
    const chartConfig = {
      labels: previewData.labels,
      datasets: [{ 
        data: previewData.values, 
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'] 
      }]
    };

    const strictOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false }
        }
    };

    return (
      <div style={{ width: '100%', height: '100%' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', fontFamily: 'sans-serif', fontSize: '18px' }}>
          {title || 'Custom Chart Preview'}
        </h3>
        <div style={{ height: '350px' }}>
          {chartType === 'bar' && <Bar data={chartConfig} options={strictOptions} />}
          {chartType === 'line' && <Line data={chartConfig} options={strictOptions} />}
          {chartType === 'pie' && <Pie data={chartConfig} options={strictOptions} />}
          {chartType === 'doughnut' && <Doughnut data={chartConfig} options={strictOptions} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard Designer</h2>
      {message && <div style={{ padding: '15px', background: message.includes("Failed") ? '#ffebee' : '#d4edda', color: '#000', marginBottom: '15px' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}>
            <option value="">-- 1. Choose Dataset --</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
          </select>

          {columns.length > 0 && (
            <>
              <input type="text" placeholder="2. Chart Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }} />
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="doughnut">Doughnut Chart</option>
              </select>
              <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}><option value="">-- 3. X-Axis (Labels) --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px' }}><option value="">-- 4. Y-Axis (Numbers) --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select>
              
              <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <select value={filterCol} onChange={(e) => setFilterCol(e.target.value)} style={{ padding: '8px', flex: 1 }}><option value="">-- 5. Filter Column --</option>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <input type="text" placeholder="e.g. 100-500" value={filterVal} onChange={(e) => setFilterVal(e.target.value)} style={{ padding: '8px', flex: 1 }} disabled={!filterCol} />
              </div>
              <button onClick={handleSaveChart} style={{ width: '100%', padding: '10px', background: '#4e73df', color: '#fff', border: 'none', cursor: 'pointer' }}>Save Chart</button>
            </>
          )}
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', height: '400px' }}>
          {selectedDataset && xAxis && yAxis ? renderChart() : <p>Select configuration to preview.</p>}
        </div>
      </div>
    </div>
  );
}

export default DashboardDesigner;