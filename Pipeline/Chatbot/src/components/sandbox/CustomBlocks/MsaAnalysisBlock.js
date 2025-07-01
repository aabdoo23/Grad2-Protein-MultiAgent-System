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

// Standard amino acid colors for sequence logo
const AMINO_ACID_COLORS = {
  'A': '#888888', 'V': '#888888', 'L': '#888888', 'I': '#888888', 'M': '#888888', 'F': '#888888', 'W': '#888888', 'P': '#888888', // Hydrophobic
  'G': '#888888', // Glycine
  'S': '#109E10', 'T': '#109E10', 'C': '#109E10', 'Y': '#109E10', 'N': '#109E10', 'Q': '#109E10', // Polar
  'K': '#145AFF', 'R': '#145AFF', 'H': '#145AFF', // Basic
  'D': '#E60A0A', 'E': '#E60A0A', // Acidic
  '-': '#FFFFFF', 'X': '#CCCCCC' // Gap/Other
};
const AMINO_ACIDS = 'ACDEFGHIKLMNPQRSTVWY-'.split('');

const MsaAnalysisBlock = ({ blockOutput, connections, inputData }) => {
  const [processedData, setProcessedData] = useState(null);
  const [viewMode, setViewMode] = useState('depth'); // 'depth', 'conservation', 'sequences'
  const [selectedDatabase, setSelectedDatabase] = useState(null);

  useEffect(() => {
    // Check if we have input data from connections
    if (inputData) {
      // Try to find data from the new specific input handles
      const resultData = inputData.msa_results || inputData.results;
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
  }, [blockOutput, connections, inputData]);

  const processResults = (data) => {
    if (!data) return null;

    let alignments = {};
    let msaSequences = [];
    let searchType = 'unknown';

    // Handle ColabFold MSA data structure
    if (data.results && data.results.metadata?.search_type === 'colabfold') {
      searchType = 'colabfold';
      
      // Extract alignments from different databases
      if (data.results.alignments?.databases) {
        alignments = data.results.alignments.databases;
      }

      // Extract MSA sequences
      if (data.results.msa?.sequences) {
        msaSequences = data.results.msa.sequences;
      }
    }
    // Handle direct MSA data structure
    else if (data.alignments?.databases) {
      alignments = data.alignments.databases;
      if (data.msa?.sequences) {
        msaSequences = data.msa.sequences;
      }
    }
    // Handle direct format
    else if (data.msa?.sequences) {
      msaSequences = data.msa.sequences;
      searchType = 'msa';
    }

    return {
      alignments,
      msaSequences,
      metadata: data.metadata || { search_type: searchType },
      totalSequences: msaSequences.length
    };
  };

  const createDepthChartData = () => {
    if (!processedData?.alignments) return null;

    const databases = Object.keys(processedData.alignments);
    const depths = databases.map(dbName => {
      const db = processedData.alignments[dbName];
      if (db.fasta?.alignment) {
        // Count sequences by counting '>' characters
        return (db.fasta.alignment.match(/>/g) || []).length;
      }
      return 0;
    });

    return {
      labels: databases,
      datasets: [
        {
          label: 'Number of Sequences in MSA',
          data: depths,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
        },
      ],
    };
  };

  const createConservationChartData = () => {
    if (!processedData?.msaSequences || processedData.msaSequences.length === 0) return null;

    // Use the first few sequences to determine length and create conservation chart
    const sequences = processedData.msaSequences.map(seq => seq.sequence).filter(Boolean);
    if (sequences.length === 0) return null;

    const sequenceLength = Math.min(sequences[0].length, 100); // Limit to first 100 positions for performance
    const numSequences = sequences.length;
    const labels = Array.from({ length: sequenceLength }, (_, i) => i + 1);
    
    const frequencies = Array.from({ length: sequenceLength }, () => ({}));
    
    for (let i = 0; i < sequenceLength; i++) {
      for (let j = 0; j < numSequences; j++) {
        const aa = sequences[j][i]?.toUpperCase();
        if (aa) {
          frequencies[i][aa] = (frequencies[i][aa] || 0) + 1;
        }
      }
    }

    const datasets = AMINO_ACIDS.map(aa => ({
      label: aa,
      data: frequencies.map(pos => (pos[aa] || 0) / numSequences),
      backgroundColor: AMINO_ACID_COLORS[aa] || '#CCCCCC',
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    }));
    
    return {
      labels: labels,
      datasets: datasets
    };
  };

  const depthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#fff'
        }
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => tooltipItems[0].label,
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US').format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Aligned Sequences',
          color: '#fff'
        },
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Database',
          color: '#fff'
        },
        ticks: {
          color: '#ccc'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const conservationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false,
        labels: {
          color: '#fff'
        }
      },
      tooltip: { 
        enabled: false 
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { 
          display: false 
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 20,
          color: '#ccc'
        },
        title: {
          display: true,
          text: 'Position',
          color: '#fff'
        }
      },
      y: {
        stacked: true,
        grid: { 
          display: false 
        },
        ticks: { 
          display: false 
        }
      },
    },
  };

  const SequenceTable = ({ sequences }) => {
    const displaySequences = sequences.slice(0, 10); // Show first 10 sequences
    
    return (
      <div className="overflow-x-auto max-h-64 custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left border-b border-gray-600">ID</th>
              <th className="px-3 py-2 text-left border-b border-gray-600">Sequence (first 50 aa)</th>
              <th className="px-3 py-2 text-right border-b border-gray-600">Length</th>
              <th className="px-3 py-2 text-left border-b border-gray-600">Database</th>
            </tr>
          </thead>
          <tbody>
            {displaySequences.map((seq, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                <td className="px-3 py-2 font-mono text-xs">
                  {seq.id || `seq_${index + 1}`}
                </td>
                <td className="px-3 py-2 font-mono text-xs max-w-xs truncate" title={seq.sequence}>
                  {seq.sequence ? seq.sequence.substring(0, 50) + (seq.sequence.length > 50 ? '...' : '') : 'N/A'}
                </td>
                <td className="px-3 py-2 text-right">
                  {seq.sequence ? seq.sequence.length : 'N/A'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {seq.database || 'Unknown'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sequences.length > 10 && (
          <div className="p-2 text-xs text-gray-400 text-center border-t border-gray-700">
            ... and {sequences.length - 10} more sequences
          </div>
        )}
      </div>
    );
  };

  if (!processedData) {
    return (
      <div className="text-center py-8 text-gray-400">
        No MSA analysis data available
      </div>
    );
  }

  const databaseNames = Object.keys(processedData.alignments || {});

  return (
    <div className="msa-analysis-block text-white">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-600">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            MSA Analysis ({processedData.totalSequences} sequences)
          </h3>
          <div className="text-sm text-gray-300">
            Type: {processedData.metadata.search_type || 'Unknown'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {databaseNames.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Database:</label>
              <select
                value={selectedDatabase || 'all'}
                onChange={(e) => setSelectedDatabase(e.target.value === 'all' ? null : e.target.value)}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value="all">All Databases</option>
                {databaseNames.map(dbName => (
                  <option key={dbName} value={dbName}>
                    {dbName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex bg-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('depth')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'depth' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Depth
            </button>
            <button
              onClick={() => setViewMode('conservation')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'conservation' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Conservation
            </button>
            <button
              onClick={() => setViewMode('sequences')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'sequences' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sequences
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-container">
        {viewMode === 'depth' && (
          <div className="chart-container" style={{ height: '400px' }}>
            <h4 className="text-md font-semibold mb-2">MSA Depth by Database</h4>
            <p className="text-sm text-gray-300 mb-3">
              This chart shows the number of sequences aligned in each database. Deeper alignments (more sequences) 
              are better for structure prediction and evolutionary analysis.
            </p>
            {createDepthChartData() && (
              <Bar options={depthChartOptions} data={createDepthChartData()} />
            )}
          </div>
        )}

        {viewMode === 'conservation' && (
          <div className="chart-container" style={{ height: '400px' }}>
            <h4 className="text-md font-semibold mb-2">Sequence Conservation (First 100 positions)</h4>
            <p className="text-sm text-gray-300 mb-3">
              This sequence logo shows conserved amino acid positions. Taller stacks indicate higher conservation, 
              which often highlights functionally or structurally important residues.
            </p>
            {createConservationChartData() && (
              <Bar options={conservationChartOptions} data={createConservationChartData()} />
            )}
            {/* Color legend */}
            <div className="mt-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-500"></div>
                  <span>Hydrophobic</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600"></div>
                  <span>Polar</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600"></div>
                  <span>Basic</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-600"></div>
                  <span>Acidic</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'sequences' && (
          <div className="table-container">
            <h4 className="text-md font-semibold mb-2">MSA Sequences</h4>
            <p className="text-sm text-gray-300 mb-3">
              Individual sequences from the multiple sequence alignment. Showing up to 10 sequences.
            </p>
            <SequenceTable sequences={processedData.msaSequences} />
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-400">Total Sequences</div>
            <div className="text-gray-300">{processedData.totalSequences}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-400">Databases</div>
            <div className="text-gray-300">{databaseNames.length}</div>
          </div>
        </div>
        {databaseNames.length > 0 && (
          <div className="mt-2 text-xs text-gray-400 text-center">
            Databases: {databaseNames.join(', ')}
          </div>
        )}
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

export default MsaAnalysisBlock;
