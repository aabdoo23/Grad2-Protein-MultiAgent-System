import { useState } from 'react';
import MSAViewer from './MSAViewer';

// Constants
const DEFAULT_MAX_SEQUENCES = 40;
const MAX_SEQUENCES_LIMIT = 1000;


const formatSequenceHeader = (name, identity, isQuery = false) => {
  name = name.split('|')[0];
  let identityStr = '';
  if (typeof identity === 'string') {
    identityStr = Number(parseFloat(identity).toFixed(2));
  } else {
    identityStr = Number(Number(identity).toFixed(2));
  }
  return isQuery ? `>${name}` : `>[${identityStr}] ${name}`;
};

const BlastResults = ({ results }) => {
  // State
  const [expandedHits, setExpandedHits] = useState({});
  const [selectedDb, setSelectedDb] = useState('all');
  const [maxSequences, setMaxSequences] = useState(DEFAULT_MAX_SEQUENCES);

  const toggleHit = (hitId) => {
    setExpandedHits(prev => ({
      ...prev,
      [hitId]: !prev[hitId]
    }));
  };

  const getUniqueDbs = () => {
    if (!results?.msa?.sequences) return ['all'];
    const dbs = new Set(results.msa.sequences.map(seq => seq.database));
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
  const processSequences = () => {
    if (!results?.msa?.sequences) return null;

    // Ensure we have a mutable copy for filtering and sorting
    let sequencesToProcess = Array.from(results.msa.sequences);

    // Filter sequences by selected database
    if (selectedDb !== 'all') {
      sequencesToProcess = sequencesToProcess.filter(seq => seq.database === selectedDb);
    }

    // Sort by identity (if identity exists) and limit to maxSequences
    // Add a check for the existence of the 'identity' property before sorting
    const sortedSequences = sequencesToProcess
      .sort((a, b) => {
        const identityA = a.identity || 0; // Default to 0 if identity is missing
        const identityB = b.identity || 0; // Default to 0 if identity is missing
        return identityB - identityA; // Sort descending
      })
      .slice(0, maxSequences);

    // Format sequences for MSA viewer
    return sortedSequences.map(seq => 
      `${formatSequenceHeader(seq.name || seq.id, seq.identity || 0, seq.id === 'Query' || seq.name === 'Query')}\n${seq.sequence}`
    ).join('\n');
  };

  // Main render logic
  if (!results) return null;

  const databases = getUniqueDbs();
  const processedAlignment = processSequences();

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

      {/* Display hits from all databases */}
      {Object.entries(results.alignments?.databases || {}).map(([dbName, dbData]) => (
        <div key={dbName} className="p-2 space-y-4">
          <h5 className="text-white text-sm font-medium">{dbName.toUpperCase()} Hits</h5>
          {dbData.hits.slice(0, maxSequences).map((hit, index) => (
            <div key={index} className="border border-[#344752] rounded-lg p-3">
              <button
                onClick={() => toggleHit(hit.id)}
                className="w-full text-left flex items-center justify-between cursor-pointer hover:bg-[#1d333d] p-2 rounded transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <h6 className="text-white font-medium flex items-center space-x-2">
                    <span>{hit.description}</span>
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
                      <span className="text-[#13a4ec] text-sm">{hit.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Identity: </span>
                      <span className="text-[#13a4ec] text-sm">{hit.identity.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Score: </span>
                      <span className="text-[#13a4ec] text-sm">{hit.score}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">E-value: </span>
                      <span className="text-[#13a4ec] text-sm">{hit.evalue}</span>
                    </div>
                  </div>

                  {hit.alignments.map((alignment, alignIndex) => (
                    <div key={alignIndex} className="bg-[#1d333d] p-3 rounded text-sm font-mono">
                      <div className="space-y-2">
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Query:</span>
                          <span className="text-[#13a4ec]">{alignment.query_seq}</span>
                        </div>
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Match:</span>
                          <span className="text-[#13a4ec]">{alignment.midline}</span>
                        </div>
                        <div className="whitespace-nowrap">
                          <span className="text-gray-400 mr-2 inline-block w-16">Subject:</span>
                          <span className="text-[#13a4ec]">{alignment.target_seq}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default BlastResults;