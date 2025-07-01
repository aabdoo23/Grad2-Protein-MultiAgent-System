import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TaxonomyAnalysisBlock = ({ blockOutput, connections, inputData }) => {
  const [processedData, setProcessedData] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [maxHits, setMaxHits] = useState(50);

  useEffect(() => {
    // Check if we have input data from connections
    if (inputData) {
      // Try to find data from the new specific input handles
      const resultData = inputData.blast_results || inputData.results;
      if (resultData) {
        const data = processResults(resultData);
        setProcessedData(data);
      }
    }
    // Check if we have blockOutput data
    else if (blockOutput && blockOutput.success) {
      const data = processResults(blockOutput.result ? blockOutput.result.results : blockOutput);
      setProcessedData(data);
    }
  }, [blockOutput, connections, inputData, maxHits]);

  const processResults = (data) => {
    if (!data) return null;

    let hits = [];
    let searchType = 'unknown';

    // Handle different data formats
    // 1. Check for BLAST results format
    if (data.results?.metadata?.search_type === 'blast' && data.results?.alignments?.databases?.blast?.hits) {
      searchType = 'blast';
      hits = data.results.alignments.databases.blast.hits;
    }
    // 2. Handle normalized BLAST schema format
    else if (data.alignments?.databases?.blast?.hits) {
      searchType = 'blast';
      hits = data.alignments.databases.blast.hits;
    }
    // 3. Handle direct results format
    else if (data.results?.alignments?.databases) {
      searchType = data.results.metadata?.search_type || 'blast';
      // Extract hits from all databases
      Object.values(data.results.alignments.databases).forEach(db => {
        if (db.hits) {
          hits.push(...db.hits);
        }
      });
    }
    // 4. Handle wrapper format
    else if (data.alignments?.databases) {
      searchType = data.metadata?.search_type || 'blast';
      Object.values(data.alignments.databases).forEach(db => {
        if (db.hits) {
          hits.push(...db.hits);
        }
      });
    }

    if (!hits.length) {
      return null;
    }

    // Take the top hits for analysis
    const topHits = hits.slice(0, maxHits);

    // Extract taxonomy information from hit descriptions
    const taxonomyCounts = topHits.reduce((acc, hit) => {
      // Look for organism names in square brackets [Organism name]
      const organismMatch = hit.description?.match(/\[(.*?)\]/) || hit.def?.match(/\[(.*?)\]/);
      let organism = "Unknown";
      
      if (organismMatch) {
        organism = organismMatch[1];
        // Clean up common patterns
        organism = organism.replace(/^(\w+\s+\w+).*/, '$1'); // Take first two words (genus species)
      }
      
      acc[organism] = (acc[organism] || 0) + 1;
      return acc;
    }, {});

    // Sort by count (descending)
    const sortedTaxonomy = Object.entries(taxonomyCounts).sort(([,a], [,b]) => b - a);

    return {
      hits: topHits,
      taxonomyCounts: taxonomyCounts,
      sortedTaxonomy: sortedTaxonomy,
      totalHits: hits.length,
      searchType: searchType,
      metadata: data.metadata || data.results?.metadata
    };
  };

  const createChartData = () => {
    if (!processedData?.sortedTaxonomy?.length) return null;

    return {
      labels: processedData.sortedTaxonomy.map(item => item[0]),
      datasets: [
        {
          label: 'Hit Count',
          data: processedData.sortedTaxonomy.map(item => item[1]),
          backgroundColor: 'rgba(19, 164, 236, 0.6)',
          borderColor: 'rgba(19, 164, 236, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    indexAxis: 'y', // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const percentage = ((context.raw / processedData.hits.length) * 100).toFixed(1);
            return `${context.raw} hits (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        title: {
          display: true,
          text: 'Number of Hits',
          color: '#fff'
        }
      },
      y: {
        ticks: {
          color: '#ccc',
          maxTicksLimit: 20 // Limit the number of organisms shown
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  if (!processedData) {
    return (
      <div className="text-center py-8 text-gray-400">
        No taxonomy analysis data available
      </div>
    );
  }

  return (
    <div className="taxonomy-analysis-block text-white">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-600">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            Taxonomic Distribution ({processedData.totalHits} total hits)
          </h3>
          <div className="text-sm text-gray-300">
            Type: {processedData.searchType}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Max hits:</label>
            <select
              value={maxHits}
              onChange={(e) => setMaxHits(parseInt(e.target.value))}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'chart' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'table' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4 p-3 bg-blue-900/20 rounded-lg">
        <p className="text-sm text-gray-300">
          This chart displays the species distribution of the top {maxHits} sequence homologs found by BLAST.
          It helps to quickly identify the primary family or group of organisms where this protein is found.
        </p>
      </div>

      {/* Content */}
      {viewMode === 'chart' ? (
        <div className="chart-container" style={{ height: '400px' }}>
          {createChartData() && (
            <Bar options={chartOptions} data={createChartData()} />
          )}
        </div>
      ) : (
        <div className="table-container">
          <div className="overflow-x-auto max-h-96 custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left border-b border-gray-600">Organism</th>
                  <th className="px-3 py-2 text-right border-b border-gray-600">Hit Count</th>
                  <th className="px-3 py-2 text-right border-b border-gray-600">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {processedData.sortedTaxonomy.map(([organism, count], index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="px-3 py-2">
                      <span className="font-medium">{organism}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {count}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {((count / processedData.hits.length) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-800/50 p-3 rounded">
          <div className="text-gray-400">Unique Organisms</div>
          <div className="text-xl font-semibold text-white">{processedData.sortedTaxonomy.length}</div>
        </div>
        <div className="bg-gray-800/50 p-3 rounded">
          <div className="text-gray-400">Most Common</div>
          <div className="text-sm font-semibold text-white truncate" title={processedData.sortedTaxonomy[0]?.[0]}>
            {processedData.sortedTaxonomy[0]?.[0] || 'N/A'}
          </div>
        </div>
        <div className="bg-gray-800/50 p-3 rounded">
          <div className="text-gray-400">Top Organism Hits</div>
          <div className="text-xl font-semibold text-white">{processedData.sortedTaxonomy[0]?.[1] || 0}</div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default TaxonomyAnalysisBlock;
