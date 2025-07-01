import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FoldseekAnalysisBlock = ({ blockOutput, connections, inputData }) => {
  const [processedData, setProcessedData] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [maxHits, setMaxHits] = useState(50);
  const [selectedDatabase, setSelectedDatabase] = useState('all');
  useEffect(() => {
    // Check if we have input data from connections
    if (inputData) {
      // Try to find data from the new specific input handles
      const resultData = inputData.foldseek_results || inputData.results;
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

    let databases = {};
    let searchType = 'foldseek';

    // Handle FoldSeek results
    if (data.results && data.results.databases) {
      databases = data.results.databases;
    } else if (data.databases) {
      databases = data.databases;
    }

    // Process each database
    const processedDatabases = {};
    Object.keys(databases).forEach(dbName => {
      const db = databases[dbName];
      if (db.hits && Array.isArray(db.hits)) {
        processedDatabases[dbName] = {
          hits: db.hits.slice(0, maxHits),
          total_hits: db.total_hits || db.hits.length
        };
      }
    });

    return {
      databases: processedDatabases,
      metadata: data.metadata || { search_type: searchType },
      totalHits: Object.values(processedDatabases).reduce((sum, db) => sum + db.total_hits, 0)
    };
  };

  const createChartData = () => {
    if (!processedData?.databases) return null;

    const datasets = [];
    const colors = {
      'afdb-swissprot': 'rgba(54, 162, 235, 0.6)',
      'afdb50': 'rgba(75, 192, 192, 0.6)',
      'pdb100': 'rgba(255, 206, 86, 0.6)'
    };
    const borderColors = {
      'afdb-swissprot': 'rgba(54, 162, 235, 1)',
      'afdb50': 'rgba(75, 192, 192, 1)',
      'pdb100': 'rgba(255, 206, 86, 1)'
    };

    Object.keys(processedData.databases).forEach(dbName => {
      const db = processedData.databases[dbName];
      if (selectedDatabase === 'all' || selectedDatabase === dbName) {
        const data = db.hits.map((hit, index) => ({
          x: hit.score || 0,
          y: Math.max(parseFloat(hit.eval) || 1e-200, 1e-200),
          r: 5,
          hitIndex: index,
          dbName: dbName,
          hit: hit
        }));

        datasets.push({
          label: dbName.toUpperCase(),
          data: data,
          backgroundColor: colors[dbName] || 'rgba(153, 102, 255, 0.6)',
          borderColor: borderColors[dbName] || 'rgba(153, 102, 255, 1)',
        });
      }
    });

    return { datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'logarithmic',
        title: {
          display: true,
          text: 'E-value (log scale)',
          color: '#fff'
        },
        ticks: {
          callback: function(value) {
            if (value === 0 || Math.log10(value) % 1 === 0) {
              return value.toExponential(0);
            }
            return '';
          },
          color: '#ccc',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        afterBuildTicks: (axis) => {
          axis.ticks = axis.ticks.filter(tick => tick.value > 0);
        }
      },
      x: {
        title: {
          display: true,
          text: 'Foldseek Score',
          color: '#fff'
        },
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#fff'
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const hit = context.raw.hit;
            return [
              `${hit.target?.substring(0, 50) || hit.target_id?.substring(0, 50) || 'Unknown'}...`,
              `E-value: ${parseFloat(hit.eval).toExponential(2)}`,
              `Score: ${context.raw.x}`,
              `Seq. Identity: ${hit.seqId}%`,
              `Taxonomy: ${hit.taxName || 'Unknown'}`
            ];
          },
        },
      },
    },
  };

  const formatEValue = (evalue) => {
    const val = parseFloat(evalue);
    return val < 1e-10 ? val.toExponential(1) : val.toFixed(6);
  };

  const FoldseekTable = ({ hits, dbName }) => {
    if (!hits || hits.length === 0) {
      return <p className="text-gray-400 text-center py-4">No hits found in {dbName}.</p>;
    }

    return (
      <div className="overflow-x-auto max-h-64 custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gray-600">Target ID</th>
              <th className="px-3 py-2 text-left border-b border-gray-600">Description</th>
              <th className="px-3 py-2 text-right border-b border-gray-600">Score</th>
              <th className="px-3 py-2 text-right border-b border-gray-600">E-value</th>
              <th className="px-3 py-2 text-right border-b border-gray-600">Seq. Identity</th>
              <th className="px-3 py-2 text-left border-b border-gray-600">Taxonomy</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((hit, index) => (
              <tr key={`${dbName}-${index}`} className="border-b border-gray-700 hover:bg-gray-800">
                <td className="px-3 py-2 font-mono text-xs">
                  {hit.target_id || hit.id || 'N/A'}
                </td>
                <td className="px-3 py-2 max-w-xs truncate" title={hit.target || hit.description || 'N/A'}>
                  {hit.target || hit.description || 'N/A'}
                </td>
                <td className="px-3 py-2 text-right">
                  {typeof hit.score === 'number' ? hit.score.toFixed(1) : hit.score || 'N/A'}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {hit.eval ? formatEValue(hit.eval) : 'N/A'}
                </td>
                <td className="px-3 py-2 text-right">
                  {hit.seqId ? `${hit.seqId}%` : 'N/A'}
                </td>
                <td className="px-3 py-2 max-w-xs truncate" title={hit.taxName || 'Unknown'}>
                  {hit.taxName || 'Unknown'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getAllHits = () => {
    if (!processedData?.databases) return [];
    
    let allHits = [];
    Object.keys(processedData.databases).forEach(dbName => {
      const db = processedData.databases[dbName];
      if (selectedDatabase === 'all' || selectedDatabase === dbName) {
        allHits.push(...db.hits.map(hit => ({ ...hit, dbName })));
      }
    });
    
    // Sort by score (descending) then by e-value (ascending)
    return allHits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return parseFloat(a.eval) - parseFloat(b.eval);
    });
  };

  if (!processedData) {
    return (
      <div className="text-center py-8 text-gray-400">
        No FoldSeek analysis data available
      </div>
    );
  }

  const databaseNames = Object.keys(processedData.databases);

  return (
    <div className="foldseek-analysis-block text-white">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-600">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            Structural Homology ({processedData.totalHits} hits)
          </h3>
          <div className="text-sm text-gray-300">
            FoldSeek Search
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Database:</label>
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value="all">All Databases</option>
              {databaseNames.map(dbName => (
                <option key={dbName} value={dbName}>
                  {dbName.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
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

      {/* Content */}
      {viewMode === 'chart' ? (
        <div className="chart-container" style={{ height: '400px' }}>
          <p className="text-sm text-gray-300 mb-3">
            Points in the top-right (high score, low E-value) represent strong structural homologs.
            PDB100 hits (yellow) are most valuable as they represent experimentally determined structures.
          </p>
          {createChartData() && (
            <Scatter options={chartOptions} data={createChartData()} />
          )}
        </div>
      ) : (
        <div className="table-container">
          {/* Combined table view */}
          {selectedDatabase === 'all' ? (
            <div>
              <h4 className="text-md font-semibold mb-2">All Structural Hits</h4>
              <FoldseekTable hits={getAllHits()} dbName="Combined" />
            </div>
          ) : (
            <div>
              <h4 className="text-md font-semibold mb-2">
                {selectedDatabase.toUpperCase()} Hits
              </h4>
              <FoldseekTable 
                hits={processedData.databases[selectedDatabase]?.hits || []} 
                dbName={selectedDatabase} 
              />
            </div>
          )}
        </div>
      )}

      {/* Database Summary */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="grid grid-cols-3 gap-4 text-sm">
          {databaseNames.map(dbName => {
            const db = processedData.databases[dbName];
            const dbColor = dbName === 'pdb100' ? 'text-yellow-400' : 
                           dbName === 'afdb-swissprot' ? 'text-blue-400' : 
                           'text-green-400';
            return (
              <div key={dbName} className="text-center">
                <div className={`font-semibold ${dbColor}`}>
                  {dbName.toUpperCase()}
                </div>
                <div className="text-gray-300">
                  {db.hits.length} hits
                </div>
              </div>
            );
          })}
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

export default FoldseekAnalysisBlock;
