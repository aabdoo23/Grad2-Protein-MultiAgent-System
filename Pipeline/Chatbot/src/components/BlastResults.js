import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RBButton from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTree, faExpand } from '@fortawesome/free-solid-svg-icons';
import PhylogeneticTreeTest from './phylotree/PhylogeneticTreeTest';
import MSAViewer from './MSAViewer';

// Constants
const DEFAULT_MAX_SEQUENCES = 40;
const MAX_SEQUENCES_LIMIT = 100;

// Helper functions
const calculateIdentity = (querySeq, targetSeq) => {
  if (!querySeq || !targetSeq || querySeq.length !== targetSeq.length) return 0;
  
  let matches = 0, total = 0;
  for (let i = 0; i < querySeq.length; ++i) {
    if (querySeq[i] !== '-' && targetSeq[i] !== '-') {
      total++;
      if (querySeq[i].toUpperCase() === targetSeq[i].toUpperCase()) matches++;
    }
  }
  return total > 0 ? Number(((matches / total) * 100).toFixed(2)) : 0;
};

const formatSequenceHeader = (name, identity, isQuery = false) => {
  name = name.split('|')[0];
  let identityStr = '';
  if (typeof identity === 'string') {
    identityStr = Number(parseFloat(identity).toFixed(2));
  } else {
    identityStr = Number(identity.toFixed(2));
  }
  return isQuery ? `>${name}` : `>[${identityStr}] ${name}`;
};

const BlastResults = ({ results }) => {
  // State
  const [expandedHits, setExpandedHits] = useState({});
  const [treeData, setTreeData] = useState(null);
  const [showTree, setShowTree] = useState(false);
  const [selectedDb, setSelectedDb] = useState('all');
  const [maxSequences, setMaxSequences] = useState(DEFAULT_MAX_SEQUENCES);
  const navigate = useNavigate();

  // Effects
  useEffect(() => {
    if (results?.phylogenetic_tree) {
      try {
        const parsedTree = parseNewick(results.phylogenetic_tree);
        setTreeData({
          name: 'Root',
          children: parsedTree
        });
      } catch (error) {
        console.error('Error parsing phylogenetic tree:', error);
      }
    }
  }, [results?.phylogenetic_tree]);

  // Helper functions
  const parseNewick = (newick) => {
    if (!newick) return [];
    
    try {
      const cleanNewick = newick.trim().replace(/\s+/g, '');
      const parts = cleanNewick.split(';')[0].split(',');
      
      return parts.map(part => {
        const [name, length] = part.split(':');
        return name ? {
          name: name.trim(),
          ...(length && { branchLength: parseFloat(length) })
        } : null;
      }).filter(Boolean);
    } catch (error) {
      console.error('Error parsing Newick string:', error);
      return [];
    }
  };

  const handleGenerateTree = () => setShowTree(true);

  const handleExpandTree = () => {
    navigate('/phylogenetic-tree', { 
      state: { 
        newick: results.phylogenetic_tree,
        title: 'Phylogenetic Tree - BLAST Results'
      } 
    });
  };

  const toggleHit = (hitId) => {
    setExpandedHits(prev => ({
      ...prev,
      [hitId]: !prev[hitId]
    }));
  };

  const filterSequencesByDb = (sequences, dbName) => {
    if (dbName === 'all') return sequences;
    return sequences.filter(seq => seq.dbName === dbName);
  };

  const getUniqueDbs = (sequences) => {
    const dbs = new Set(sequences.map(seq => seq.dbName));
    return ['all', ...Array.from(dbs)];
  };

  const handleMaxSequencesChange = (value) => {
    setMaxSequences(Math.min(MAX_SEQUENCES_LIMIT, Math.max(1, parseInt(value) || 1)));
  };

  // Filter UI Component
  const FilterControls = ({ databases, selectedDb, onDbChange, maxSequences, onMaxSequencesChange }) => (
    <div className="bg-[#1a2b34] rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <div>
          <label className="text-white text-sm font-medium">Database:</label>
          <select 
            className="ml-2 bg-[#2d3e4a] text-white rounded px-2 py-1"
            value={selectedDb}
            onChange={(e) => onDbChange(e.target.value)}
          >
            {databases.map(db => (
              <option key={db} value={db}>{db}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white text-sm font-medium">Max Sequences:</label>
          <input 
            type="number"
            min="1"
            max={MAX_SEQUENCES_LIMIT}
            value={maxSequences}
            onChange={(e) => onMaxSequencesChange(e.target.value)}
            className="ml-2 bg-[#2d3e4a] text-white rounded px-2 py-1 w-20"
          />
        </div>
      </div>
    </div>
  );

  // Sequence Processing
  const processSequences = (sequences) => {
    if (!sequences || sequences.length === 0) return null;

    // Find the query sequence (it should be the first one with dbName 'query')
    const querySequence = sequences.find(s => s.dbName === 'query');
    if (!querySequence) return null;

    // Process all sequences except the query
    const sequencesWithIdentity = sequences
      .filter(s => s.dbName !== 'query')
      .map(s => ({
        ...s,
        // Use provided identity for local BLAST results, calculate for others
        identity: s.identity !== undefined ? Number(s.identity.toFixed(2)) : calculateIdentity(querySequence.seq, s.seq)
      }));

    // Filter and sort sequences
    const filteredSequences = filterSequencesByDb(sequencesWithIdentity, selectedDb)
      .sort((a, b) => b.identity - a.identity)
      .slice(0, maxSequences);

    // Combine query with filtered sequences
    const finalSequences = [
      { ...querySequence, identity: 100.00 },
      ...filteredSequences
    ];

    return finalSequences.map((s, idx) => 
      `${formatSequenceHeader(s.name, s.identity, idx === 0)}\n${s.seq}`
    ).join('\n');
  };

  // Main render logic
  if (!results) return null;

  const isColabFold = results.metrics?.search_type === 'colabfold';
  let sequences = [];
  let databases = ['all', 'ncbi', 'local'];

  if (isColabFold) {
    // Process ColabFold sequences
    if (results.alignments) {
      // First, find the query sequence
      let querySequence = null;
      for (const dbName in results.alignments) {
        if (results.alignments[dbName]?.fasta?.alignment) {
          const lines = results.alignments[dbName].fasta.alignment.split(/\r?\n/);
          let current = { name: '', seq: '', dbName };
          
          for (const line of lines) {
            if (line.startsWith('>')) {
              if (current.name && current.name.includes('Query')) {
                querySequence = { ...current, dbName: 'query' };
                break;
              }
              current = { name: `${line.slice(1).split('|')[0]} [${dbName}]`, seq: '', dbName };
            } else {
              current.seq += line.trim();
            }
          }
          if (current.name && current.name.includes('Query')) {
            querySequence = { ...current, dbName: 'query' };
          }
          if (querySequence) break;
        }
      }

      // Add query sequence if found
      if (querySequence) {
        sequences.push(querySequence);
      }

      // Process other sequences
      for (const dbName in results.alignments) {
        if (results.alignments[dbName]?.fasta?.alignment) {
          const lines = results.alignments[dbName].fasta.alignment.split(/\r?\n/);
          let current = { name: '', seq: '', dbName };
          
          for (const line of lines) {
            if (line.startsWith('>')) {
              if (current.name && !current.name.includes('Query')) {
                sequences.push(current);
              }
              current = { name: `${line.slice(1).split('|')[0]} [${dbName}]`, seq: '', dbName };
            } else {
              current.seq += line.trim();
            }
          }
          if (current.name && !current.name.includes('Query')) {
            sequences.push(current);
          }
        }
      }
    }
    databases = getUniqueDbs(sequences);
  } else if (results.hits) {
    // Process NCBI BLAST sequences
    let queryAligned = null;
    for (const hit of results.hits) {
      if (hit.hsps && hit.hsps.length > 0 && hit.hsps[0].qseq) {
        queryAligned = hit.hsps[0].qseq;
        break;
      }
    }

    if (queryAligned) {
      sequences.push({ name: 'Query', seq: queryAligned, dbName: 'query' });
    }

    for (const hit of results.hits) {
      if (hit.hsps && hit.hsps.length > 0 && hit.hsps[0].hseq) {
        sequences.push({
          name: hit.accession || hit.id || 'Hit',
          seq: hit.hsps[0].hseq,
          dbName: hit.db || 'ncbi',
          identity: hit.hsps[0].identity
        });
      }
    }
  }

  const processedAlignment = processSequences(sequences);

  return (
    <div className="space-y-4">
      <FilterControls
        databases={databases}
        selectedDb={selectedDb}
        onDbChange={setSelectedDb}
        maxSequences={maxSequences}
        onMaxSequencesChange={handleMaxSequencesChange}
      />

      {processedAlignment && (
        <div className="bg-[#1a2b34] rounded-lg p-4">
          <h5 className="text-white text-sm font-medium mb-2">Multiple Sequence Alignment</h5>
          <MSAViewer fastaAlignment={processedAlignment} />
        </div>
      )}

      {results.phylogenetic_tree && (
        <div className="bg-[#1a2b34] rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h5 className="text-white text-sm font-medium">Phylogenetic Tree</h5>
            <div className="flex space-x-2">
              <RBButton
                variant="outline-light"
                size="sm"
                onClick={handleGenerateTree}
                disabled={showTree}
              >
                <FontAwesomeIcon icon={faTree} className="me-2 text-white" />
                <span className="text-white">{showTree ? 'Tree Generated' : 'Generate Tree'}</span>
              </RBButton>
              {showTree && (
                <RBButton
                  variant="outline-light"
                  size="sm"
                  onClick={handleExpandTree}
                >
                  <FontAwesomeIcon icon={faExpand} className="me-2 text-white" />
                  <span className="text-white">Expand View</span>
                </RBButton>
              )}
            </div>
          </div>
          {showTree && (
            <div className="tree-container" style={{ height: '400px', width: '100%', overflow: 'auto' }}>
              <PhylogeneticTreeTest
                newick={results.phylogenetic_tree}
                width={800}
                height={400}
                padding={20}
                includeBLAxis={true}
              />
            </div>
          )}
        </div>
      )}

      {!isColabFold && results.hits && (
        <div className="space-y-4">
          {results.hits.map((hit, index) => (
            <div key={index} className="border border-[#344752] rounded-lg p-3">
              <button
                onClick={() => toggleHit(hit.id)}
                className="w-full text-left flex items-center justify-between cursor-pointer hover:bg-[#1d333d] p-2 rounded transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <h6 className="text-white font-medium flex items-center space-x-2">
                    <span>{hit.def}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#344752] rounded-full text-gray-300">
                      {hit.accession}
                    </span>
                  </h6>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedHits[hit.id] ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedHits[hit.id] && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400 text-sm">Length: </span>
                      <span className="text-[#13a4ec] text-sm">{hit.len}</span>
                    </div>
                  </div>

                  {hit.hsps.map((hsp, hspIndex) => (
                    <div key={hspIndex} className="bg-[#1d333d] p-3 rounded text-sm font-mono">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-gray-400 text-sm">Score: </span>
                          <span className="text-[#13a4ec] text-sm">{hsp.score}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">E-value: </span>
                          <span className="text-[#13a4ec] text-sm">{hsp.evalue}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Identity: </span>
                          <span className="text-[#13a4ec] text-sm">{Number(hsp.identity).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Gaps: </span>
                          <span className="text-[#13a4ec] text-sm">{hsp.gaps}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Query:</span>
                          <span className="text-[#13a4ec]">{hsp.qseq}</span>
                        </div>
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Match:</span>
                          <span className="text-[#13a4ec]">{hsp.midline}</span>
                        </div>
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Subject:</span>
                          <span className="text-[#13a4ec]">{hsp.hseq}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlastResults;