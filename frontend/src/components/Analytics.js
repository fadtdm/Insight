import React, { useState, useEffect, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';

function Analytics({ datasets = [], token }) {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedX, setSelectedX] = useState('');
  const [selectedY, setSelectedY] = useState('');
  
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  
  const [aiInsights, setAiInsights] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');
  
  const reportRef = useRef();

  // 1. Fetch data and columns when a dataset is selected
  useEffect(() => {
    if (!selectedDataset) {
      setRawData([]);
      setAvailableColumns([]);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/dataset-content/${selectedDataset}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = res.data;
        if (data && data.length > 0) {
          setRawData(data);
          const columns = Object.keys(data[0]);
          setAvailableColumns(columns);
          
          // Auto-select first string-like column for X, and first numeric-like for Y
          setSelectedX(columns[0]);
          const numCol = columns.find(col => !isNaN(parseFloat(data[0][col]))) || columns[1];
          setSelectedY(numCol);
        }
      } catch (err) {
        setError('Failed to fetch dataset content.');
        console.error(err);
      }
    };

    fetchData();
  }, [selectedDataset, token]);

  // 2. Aggregate data for the charts when X, Y, or Raw Data changes
  useEffect(() => {
    if (!rawData.length || !selectedX || !selectedY) return;

    const aggregated = {};
    
    rawData.forEach(row => {
      const xValue = row[selectedX] || 'Unknown';
      // Clean the Y value (remove currency symbols, commas, etc.)
      const yString = String(row[selectedY]).replace(/[^0-9.-]+/g, "");
      const yValue = parseFloat(yString);

      if (!isNaN(yValue)) {
        if (!aggregated[xValue]) aggregated[xValue] = 0;
        aggregated[xValue] += yValue;
      }
    });

    setChartData({
      labels: Object.keys(aggregated),
      values: Object.values(aggregated)
    });
  }, [rawData, selectedX, selectedY]);

  // 3. Request AI Insights from the Backend
  const handleGenerateInsights = async () => {
    if (chartData.labels.length === 0) return;
    
    setIsAiLoading(true);
    setAiInsights('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/ai-insights', {
        datasetName: datasets.find(d => d.dataset_id.toString() === selectedDataset)?.file_name || 'Dataset',
        xAxis: selectedX,
        yAxis: selectedY,
        labels: chartData.labels,
        values: chartData.values
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAiInsights(response.data.insights);
    } catch (err) {
      setAiInsights("Failed to generate AI insights. Check your backend connection.");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

// 4. Export to PDF (Updated for Multi-Page and AI Insights)
  const exportPDF = () => {
    const input = reportRef.current;
    
    // We add a slight delay to ensure React has fully painted the AI text before snapping the picture
    setTimeout(() => {
      html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        // Calculate the total height of the image scaled to fit the PDF width
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0; // Starts at the top of the first page

        // Print the first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        // If there is still image left over, loop and create new pages!
        while (heightLeft > 0) {
          position = heightLeft - imgHeight; // Shift the image up by the height of the pages we've already printed
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`AI_Analytics_Report_${selectedDataset || 'Data'}.pdf`);
      });
    }, 100);
  };

  // Chart configurations
  const barConfig = {
    labels: chartData.labels,
    datasets: [{
      label: `${selectedY} by ${selectedX}`,
      data: chartData.values,
      backgroundColor: '#4e73df',
    }],
  };

  const pieConfig = {
    labels: chartData.labels,
    datasets: [{
      data: chartData.values,
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#1cc88a', '#f6c23e', '#858796', '#e74a3b', '#343a40'],
    }],
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#333' }}>Dynamic AI Analytics</h2>
        <button 
          onClick={exportPDF} 
          style={{ padding: '8px 16px', background: '#e83e8c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Export to PDF
        </button>
      </div>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Filter Panel */}
      <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', border: '1px solid #e3e6f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Target Dataset</label>
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            <option value="">-- Select a Dataset --</option>
            {datasets.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.file_name}</option>)}
          </select>
        </div>
        
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>X-Axis (Categories)</label>
          <select value={selectedX} onChange={(e) => setSelectedX(e.target.value)} disabled={!availableColumns.length} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Y-Axis (Values)</label>
          <select value={selectedY} onChange={(e) => setSelectedY(e.target.value)} disabled={!availableColumns.length} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #d1d3e2' }}>
            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
      </div>

      {/* Exportable Report Area */}
      <div ref={reportRef} style={{ background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #e3e6f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #f8f9fc', paddingBottom: '10px', marginTop: 0, color: '#4e73df' }}>
          {selectedDataset ? `${selectedY} vs. ${selectedX}` : 'Awaiting Data Selection...'}
        </h3>
        
        {chartData.labels.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: '30px' }}>
              <div style={{ flex: '1 1 500px', maxWidth: '600px' }}>
                <Bar data={barConfig} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
              <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
                <Pie data={pieConfig} />
              </div>
            </div>

            {/* AI Agent Section */}
            <div style={{ borderTop: '2px solid #f8f9fc', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333' }}>Insights</h4>
                <button 
                  onClick={handleGenerateInsights}
                  disabled={isAiLoading}
                  style={{ padding: '8px 16px', background: '#1cc88a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', opacity: isAiLoading ? 0.7 : 1 }}
                >
                  {isAiLoading ? 'Analyzing Data...' : 'Generate Deep Insights'}
                </button>
              </div>
              
              <div style={{ minHeight: '100px', padding: '20px', background: '#f8f9fc', borderRadius: '5px', border: '1px dashed #d1d3e2', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {isAiLoading && <span style={{ color: '#858796', fontStyle: 'italic' }}>The AI is crunching the numbers...</span>}
                {!isAiLoading && !aiInsights && <span style={{ color: '#858796' }}>Click the button above to generate a professional analysis of the charts.</span>}
                {!isAiLoading && aiInsights && (
                  <div style={{ color: '#333' }} dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br/>') }} />
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#858796' }}>
            Please select a dataset, X-axis, and Y-axis to render charts.
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;