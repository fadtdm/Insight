import React, { useState, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Analytics({ datasets }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const reportRef = useRef(); // Used to target the area we want to export

  // Simulated data based on filters for prototype purposes
  const getFilteredData = () => {
    const baseData = [300, 450, 200, 600, 800];
    const multiplier = selectedCategory === 'All' ? 1 : 0.5;
    return baseData.map(val => val * multiplier);
  };

  const barData = {
    labels: ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Other'],
    datasets: [
      {
        label: 'Revenue by Category ($)',
        data: getFilteredData(),
        backgroundColor: '#4BC0C0',
      },
    ],
  };

  const pieData = {
    labels: ['North', 'South', 'East', 'West'],
    datasets: [
      {
        data: [40, 25, 20, 15],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#9966FF'],
      },
    ],
  };

  // PDF Export Functionality
  const exportPDF = () => {
    const input = reportRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('SME_Analytics_Report.pdf');
    });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Advanced Analytics</h2>
        <button 
          onClick={exportPDF} 
          style={{ padding: '8px 16px', background: '#e83e8c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Export to PDF
        </button>
      </div>
      <p>Filter and analyze your data with precision.</p>

      {/* Filter Panel */}
      <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Date Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ padding: '6px' }}>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Category</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px' }}>
            <option>All</option>
            <option>Electronics</option>
            <option>Clothing</option>
          </select>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button style={{ padding: '7px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Apply Filters
          </button>
        </div>
      </div>

      {/* Exportable Report Area */}
      <div ref={reportRef} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
        <h3 style={{ borderBottom: '2px solid #f4f4f4', paddingBottom: '10px' }}>Performance Trends</h3>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', maxWidth: '600px' }}>
            <Bar data={barData} />
          </div>
          <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
            <h4 style={{ textAlign: 'center' }}>Regional Distribution</h4>
            <Pie data={pieData} />
          </div>
        </div>
        
        {/* Basic Insights Generator */}
        <div style={{ marginTop: '30px', padding: '15px', background: '#e3f2fd', borderRadius: '5px' }}>
          <strong>💡 Automated Insight:</strong> 
          {selectedCategory === 'All' 
            ? " Electronics are currently driving the most revenue. Consider running targeted promotions in the North region to capitalize on high engagement."
            : ` Viewing data for ${selectedCategory}. Trends indicate a stable performance over the ${dateRange}.`}
        </div>
      </div>
    </div>
  );
}

export default Analytics;