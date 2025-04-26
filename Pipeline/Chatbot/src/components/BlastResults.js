import React, { useState } from 'react';

const BlastResults = ({ results }) => {
  const [expandedHits, setExpandedHits] = useState({});

  if (!results || !results.hits) return null;

  const toggleHit = (hitId) => {
    setExpandedHits(prev => ({
      ...prev,
      [hitId]: !prev[hitId]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a2b34] rounded-lg p-4">
        <h5 className="text-white text-sm font-medium mb-2">Search Statistics</h5>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(results.statistics).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-300 text-sm capitalize">{key}:</span>
              <span className="text-[#13a4ec] text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

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
                        <span className="text-[#13a4ec] text-sm">{hsp.identity}</span>
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
    </div>
  );
};

export default BlastResults; 