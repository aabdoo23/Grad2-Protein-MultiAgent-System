import React, { useState, useEffect, memo } from 'react';
import { FixedSizeList } from 'react-window';
import axios from 'axios';
import { BASE_URL } from '../../config/config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 900000, // 15 minutes
  headers: {
    'Content-Type': 'application/json'
  }
});

const ITEM_HEIGHT = 450; // Adjusted base height for a hit item. Viewer + other content can make it taller.
                         // Content might need internal scrolling if it exceeds this.

const HitItem = memo(({ index, style, data }) => {
  const {
    hitsArray,
    dbName,
    visualizedHits,
    evaluationResults,
    isEvaluating,
    handleVisualizeDirectly,
    initViewerProp,
  } = data;

  const hit = hitsArray[index];
  const hitKey = `${dbName}-${hit.target_id}`;
  const viewerId = `viewer-${hitKey}`;
  const pdbContent = visualizedHits[hitKey]; // This is PDB string content or null/error

  useEffect(() => {
    const viewerElement = document.getElementById(viewerId);
    if (pdbContent && typeof pdbContent === 'string' && viewerElement) {
      initViewerProp(viewerId, pdbContent, hitKey);
    }
  }, [pdbContent, viewerId, initViewerProp, hitKey]);

  return (
    <div style={style} className="flex flex-col"> {/* Apply style from react-window. Removed outer mt-3. Added flex-col for structure. */}
      <div className="border border-[#344752] rounded-lg p-3 m-1 flex-grow flex flex-col"> {/* Added m-1 for spacing, flex-grow */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="col-span-2">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-400 text-sm">Target ID:</span>
              <span className="text-[#13a4ec] text-sm break-words whitespace-pre-wrap pr-4">{hit.target_id}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-gray-400 text-sm">Target:</span>
              <span className="text-[#13a4ec] text-sm break-words whitespace-pre-wrap pr-4">{hit.target}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 col-span-2 gap-x-4 gap-y-2 mt-2">
            <div>
              <span className="text-gray-400 text-sm">Score: </span>
              <span className="text-[#13a4ec] text-sm">{hit.score}</span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">E-value: </span>
              <span className="text-[#13a4ec] text-sm">{hit.eval.toExponential(2)}</span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Probability: </span>
              <span className="text-[#13a4ec] text-sm">{(hit.prob * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Sequence Identity: </span>
              <span className="text-[#13a4ec] text-sm">{hit.seqId}%</span>
            </div>
          </div>
        </div>
        <div className="bg-[#1d333d] p-3 rounded text-sm font-mono mt-3 overflow-x-auto">
          <div className="mb-2 whitespace-nowrap">
            <span className="text-gray-400 mr-2 inline-block w-16">Query:</span>
            <span className="text-[#13a4ec]">{hit.qAln}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-gray-400 mr-2 inline-block w-16">Match:</span>
            <span className="text-[#13a4ec]">{hit.dbAln}</span>
          </div>
        </div>
        {hit.taxName && (
          <div className="mt-3 text-sm">
            <span className="text-gray-400">Organism: </span>
            <span className="text-[#13a4ec] break-words">{hit.taxName}</span>
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => handleVisualizeDirectly(hit, dbName)}
            disabled={isEvaluating[hitKey]}
            className="bg-[#13a4ec] hover:bg-[#0d8bc4] text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {isEvaluating[hitKey] ? 'Loading...' : (pdbContent && typeof pdbContent === 'string' ? 'Reload Structure' : 'Visualize Structure')}
          </button>
        </div>

        {pdbContent && typeof pdbContent === 'string' && (
          <div className="bg-[#1a2b34] rounded-lg p-3 mt-3">
            <>
              <div
                id={viewerId}
                className="w-full h-[300px] rounded-lg mb-3 bg-gray-800 border border-gray-700" // Mol* viewer will use this
              />
              <div className="mt-2 text-xs text-gray-300">
                <div className="w-full h-2 rounded overflow-hidden"
                  style={{
                    background: 'linear-gradient(to left, #313695, #ffffbf, #a50026)'
                  }} />
                <div className="flex justify-between mt-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <div className="text-center mt-0.5">pLDDT score</div>
              </div>
            </>
          </div>
        )}
        {/* Placeholder for error message if pdbContent is an error indicator */}
        {pdbContent && typeof pdbContent !== 'string' && (
            <div className="mt-3 text-red-400 text-sm p-3 bg-[#2a2e30] rounded-lg">
                Error loading structure: {pdbContent.message || 'Unknown error'}
            </div>
        )}

        {evaluationResults[hitKey] && (
          <div className="mt-3 bg-[#1d333d] p-3 rounded-lg">
            <h6 className="text-white font-medium mb-2">Structure Evaluation</h6>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-400 text-sm">TM-score: </span>
                <span className="text-[#13a4ec] text-sm font-medium">
                  {evaluationResults[hitKey].tm_score.toFixed(3)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">RMSD: </span>
                <span className="text-[#13a4ec] text-sm font-medium">
                  {evaluationResults[hitKey].rmsd.toFixed(2)} Å
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Aligned Length: </span>
                <span className="text-[#13a4ec] text-sm font-medium">
                  {evaluationResults[hitKey].aligned_length}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Sequence Identity: </span>
                <span className="text-[#13a4ec] text-sm font-medium">
                  {(evaluationResults[hitKey].seq_id * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const FoldSeekResults = ({ results, originalPdbPath, initViewer: initViewerProp }) => {
  const [visualizedHits, setVisualizedHits] = useState({}); // Stores PDB content string, or null, or an error object
  const [evaluationResults, setEvaluationResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState({});

  if (!results || !results.databases) return null;

  const handleVisualize = async (hit, dbName) => {
    const hitKey = `${dbName}-${hit.target_id}`;
    setIsEvaluating(prev => ({ ...prev, [hitKey]: true }));
    setVisualizedHits(prev => ({ ...prev, [hitKey]: null })); // Clear previous PDB content

    try {
      if (!originalPdbPath) {
        console.error('Original PDB path is not available for evaluation.');
        // Visualization can proceed, but evaluation might be affected or skipped.
      }

      const downloadResponse = await api.post('/download-pdb', {
        target_id: hit.target_id,
        database: dbName
      });

      if (downloadResponse.data.success) {
        const pdbPathOnServer = downloadResponse.data.pdb_file;

        // Fetch PDB content
        const pdbContentResponse = await fetch(`${BASE_URL}/api/pdb-content?filePath=${encodeURIComponent(pdbPathOnServer)}`);
        if (!pdbContentResponse.ok) {
          const errorText = await pdbContentResponse.text();
          throw new Error(`Failed to fetch PDB content: ${pdbContentResponse.status} ${errorText}`);
        }
        const pdbContent = await pdbContentResponse.text();

        if (!pdbContent) {
          throw new Error('Fetched PDB content is empty.');
        }
        
        setVisualizedHits(prev => ({
          ...prev,
          [hitKey]: pdbContent // Store PDB string content
        }));

      } else {
        throw new Error(downloadResponse.data.message || 'Failed to download PDB location.');
      }
    } catch (error) {
      console.error('Error in visualization or evaluation for hit ' + hitKey + ':', error);
      setVisualizedHits(prev => ({
        ...prev,
        [hitKey]: { message: error.message || 'An unknown error occurred during visualization.' } // Store error object
      }));
    } finally {
      setIsEvaluating(prev => ({ ...prev, [hitKey]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(results.databases).map(([dbName, dbData]) => {
        if (!dbData.hits || dbData.hits.length === 0) {
          return (
            <div key={dbName} className="bg-[#1a2b34] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="text-white font-medium">{dbName}</h6>
                 <span className="text-xs px-2 py-0.5 bg-[#344752] rounded-full text-gray-300">
                    0 hits
                 </span>
              </div>
              <p className="text-gray-400 mt-2">No hits found in this database.</p>
            </div>
          );
        }

        const itemDataForList = {
          hitsArray: dbData.hits,
          dbName,
          originalPdbPath,
          visualizedHits,
          evaluationResults,
          isEvaluating,
          handleVisualizeDirectly: handleVisualize, // Pass the main handler
          initViewerProp
        };
        
        // Calculate height for the list: either total height of items or a max (e.g., 600px)
        const listHeight = Math.min(dbData.hits.length * ITEM_HEIGHT, 700);


        return (
          <div key={dbName} className="bg-[#1a2b34] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h6 className="text-white font-medium">{dbName}</h6>
              <span className="text-xs px-2 py-0.5 bg-[#344752] rounded-full text-gray-300">
                {dbData.hits.length} hits
              </span>
            </div>
            <FixedSizeList
              height={listHeight}
              itemCount={dbData.hits.length}
              itemSize={ITEM_HEIGHT}
              itemData={itemDataForList}
              width="100%"
              className="custom-scrollbar" // For styling scrollbar if needed
            >
              {HitItem}
            </FixedSizeList>
          </div>
        );
      })}
    </div>
  );
};

export default FoldSeekResults;