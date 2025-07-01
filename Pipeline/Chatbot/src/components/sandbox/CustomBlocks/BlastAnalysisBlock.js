import React, { useState, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    LogarithmicScale,
} from 'chart.js';

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

const BlastAnalysisBlock = ({ blockOutput, connections, inputData }) => {
    const [processedData, setProcessedData] = useState(null);
    const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
    const [maxHits, setMaxHits] = useState(50);  useEffect(() => {
    // Check if we have input data from connections
    if (inputData) {
      // Try to find data from the new specific input handles
      const resultData = inputData.blast_results || inputData.msa_results || inputData.results;
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
  }, [blockOutput, connections, inputData, maxHits]);const processResults = (data) => {
        if (!data) return null;

        let hits = [];
        let searchType = 'unknown';    // Handle different data formats
        // 1. Check for ColabFold first (since it has both alignments and msa data)
        if (data.results.metadata?.search_type === 'colabfold') {
            searchType = 'colabfold';
            const msa = data.results?.msa || data.msa;
            if (msa?.sequences) {
                hits = msa.sequences
                    .filter(seq => seq.id !== 'query' && seq.id !== 'Query')
                    .map((seq, index) => ({
                        id: seq.id,
                        accession: seq.id,
                        def: seq.id,
                        len: seq.sequence?.length || 0,
                        score: 100 - index, // Pseudo score based on order
                        evalue: seq.evalue || Math.pow(10, -10 - index), // Pseudo e-value
                        identity: seq.identity || 95 - (index * 2), // Pseudo identity decreasing with order
                        alignments: [],
                        source: seq.database || 'colabfold'
                    }));
            }
        }
        // 2. Check for normalized BLAST schema format (from schema_normalizer.py)
        else if (data.results.metadata?.search_type === 'blast' && data.alignments?.databases?.blast?.hits) {
            searchType = 'blast';
            hits = data.alignments.databases.blast.hits.map(hit => ({
                id: hit.id,
                accession: hit.accession,
                def: hit.description,
                len: hit.length,
                score: hit.score,
                evalue: hit.evalue,
                identity: hit.identity,
                alignments: hit.alignments || [],
                source: 'blast'
            }));
        } else if (data.results.metadata?.search_type === 'foldseek') {
            searchType = 'foldseek';
            // Process FoldSeek results
            Object.values(data.alignments?.databases || {}).forEach(db => {
                hits.push(...db.hits.map(hit => ({
                    id: hit.id,
                    accession: hit.accession,
                    def: hit.description,
                    len: hit.length,
                    score: hit.score,
                    evalue: hit.evalue,
                    identity: hit.identity,
                    coverage: hit.coverage,
                    alignments: hit.alignments || [],
                    source: 'foldseek'
                })));
            });
        }    // 2. Handle direct results format (local BLAST, NCBI BLAST) - Check both with and without 'results' wrapper
        else if (data.results?.alignments?.databases || data.alignments?.databases) {
            // This is the format from local BLAST and NCBI BLAST output
            const alignments = data.results?.alignments || data.alignments;
            Object.entries(alignments.databases).forEach(([dbName, dbData]) => {
                if (dbData.hits) {
                    searchType = dbName === 'blast' ? 'ncbi_blast' : 'local_blast';
                    hits.push(...dbData.hits.map(hit => ({
                        id: hit.id,
                        accession: hit.accession,
                        def: hit.description,
                        len: hit.length,
                        score: hit.score,
                        evalue: hit.evalue,
                        identity: hit.identity,
                        alignments: hit.alignments || [],
                        source: dbName
                    })));
                }
            });
        }
        // 3. Fallback for direct hits format (legacy)
        else if (data.hits) {
            searchType = 'legacy';
            hits = data.hits.map(hit => ({
                id: hit.id,
                accession: hit.accession,
                def: hit.def,
                len: hit.len,
                score: hit.hsps?.[0]?.score || hit.score,
                evalue: hit.hsps?.[0]?.evalue || hit.evalue,
                identity: hit.hsps?.[0]?.identity || hit.identity,
                alignments: hit.hsps || [],
                source: 'unknown'
            }));
        }

        return {
            hits: hits.slice(0, maxHits),
            metadata: data.metadata || { search_type: searchType },
            totalHits: hits.length
        };
    };

    const createChartData = () => {
        if (!processedData?.hits) return null;

        return {
            datasets: [
                {
                    label: 'Search Hits',
                    data: processedData.hits.map((hit, index) => ({
                        x: parseFloat(hit.identity) || 0,
                        y: Math.max(parseFloat(hit.evalue) || 1e-200, 1e-200),
                        r: Math.max((hit.alignments?.[0]?.query_end - hit.alignments?.[0]?.query_start) / 15 || 5, 3),
                        hitIndex: index
                    })),
                    backgroundColor: 'rgba(19, 164, 236, 0.6)',
                    borderColor: 'rgba(19, 164, 236, 1)',
                },
            ],
        };
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
                    callback: function (value) {
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
                    text: 'Percent Identity (%)',
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
                        const hit = processedData.hits[context.raw.hitIndex];
                        return [
                            `${hit.def.substring(0, 50)}...`,
                            `E-value: ${parseFloat(hit.evalue).toExponential(2)}`,
                            `Identity: ${context.raw.x.toFixed(1)}%`,
                            `Score: ${hit.score}`,
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

    const createNCBIUrl = (hit, index) => {
        const idParts = hit.id.split('|');
        const accessionId = idParts.length > 1 ? idParts[1] : hit.accession;
        return `https://www.ncbi.nlm.nih.gov/protein/${accessionId}?report=genbank&log$=prottop&blast_rank=${index + 1}`;
    };

    if (!processedData) {
        return (
            <div className="text-center py-8 text-gray-400">
                No analysis data available
            </div>
        );
    }

    return (
        <div className="sequence-analysis-block text-white">
            {/* Header with controls */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-600">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">
                        Sequence Analysis ({processedData.totalHits} hits)
                    </h3>
                    <div className="text-sm text-gray-300">
                        Type: {processedData.metadata.search_type || 'Unknown'}
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
                            className={`px-3 py-1 text-sm ${viewMode === 'chart' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            Chart
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1 text-sm ${viewMode === 'table' ? 'bg-[#13a4ec] text-white' : 'text-gray-300 hover:bg-gray-600'
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
                        Points in the top-right (high identity, low E-value) represent strong homologs.
                        Bubble size indicates alignment length.
                    </p>
                    {createChartData() && (
                        <Scatter options={chartOptions} data={createChartData()} />
                    )}
                </div>
            ) : (
                <div className="table-container">
                    <div className="overflow-x-auto max-h-96 custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left border-b border-gray-600">Accession</th>
                                    <th className="px-3 py-2 text-left border-b border-gray-600">Description</th>
                                    <th className="px-3 py-2 text-right border-b border-gray-600">Score</th>
                                    <th className="px-3 py-2 text-right border-b border-gray-600">E-value</th>
                                    <th className="px-3 py-2 text-right border-b border-gray-600">Identity</th>
                                    <th className="px-3 py-2 text-right border-b border-gray-600">Length</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.hits.map((hit, index) => (
                                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                                        <td className="px-3 py-2">
                                            <a
                                                href={createNCBIUrl(hit, index)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#13a4ec] hover:text-[#0f8fd1] underline"
                                            >
                                                {hit.accession}
                                            </a>
                                        </td>
                                        <td className="px-3 py-2 max-w-xs truncate" title={hit.def}>
                                            {hit.def}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {typeof hit.score === 'number' ? hit.score.toFixed(1) : hit.score}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {formatEValue(hit.evalue)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {typeof hit.identity === 'number' ? `${hit.identity.toFixed(1)}%` : `${hit.identity}%`}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {hit.len}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

export default BlastAnalysisBlock;
