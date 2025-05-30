import React, { useState, useRef } from 'react';
import * as NGL from 'ngl';
import axios from 'axios';
import { BASE_URL } from '../../config/config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 900000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const FoldSeekResults = ({ results, originalPdbPath }) => {
  const [visualizedHits, setVisualizedHits] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState({});
  const viewerRefs = useRef({});

  if (!results || !results.databases) return null;

  const initViewer = (jobId, pdbPath) => {
    // if (!viewerRefs.current[jobId]) {
    const stage = new NGL.Stage(`viewer-${jobId}`, { backgroundColor: '#1a2b34' });
    viewerRefs.current[jobId] = stage;

    // Load and display the PDB structure
    const filename = pdbPath.split('\\').pop();
    stage.loadFile(`${BASE_URL}/pdb/${filename}`).then(component => {
      component.addRepresentation('cartoon', {
        color: 'bfactor',
        colorScale: 'RdYlBu',
        colorScaleReverse: true,
        colorDomain: [0, 100],
        roughness: 1.0,
        metalness: 0.0
      });
      component.autoView();

    });
    // }
  };

  const handleVisualize = async (hit, dbName) => {
    const hitKey = `${dbName}-${hit.target_id}`;
    try {
      if (!originalPdbPath) {
        console.error('Original PDB path is not available');
        return;
      }

      const response = await api.post('/download-pdb', {
        target_id: hit.target_id,
        database: dbName
      });

      if (response.data.success) {
        const pdbPath = response.data.pdb_file;
        setVisualizedHits(prev => ({
          ...prev,
          [hitKey]: pdbPath
        }));

        const originalPdbFilename = originalPdbPath.split('\\').pop();
        const evalResponse = await api.post('/evaluate-structures', {
          pdb1_path: originalPdbFilename,
          pdb2_path: pdbPath
        });

        if (evalResponse.data.success) {
          setEvaluationResults(prev => ({
            ...prev,
            [hitKey]: evalResponse.data
          }));
        }
      }
    } catch (error) {
      console.error('Error in visualization or evaluation:', error);
    } finally {
      setIsEvaluating(prev => ({ ...prev, [hitKey]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(results.databases).map(([dbName, dbData]) => (
        <div key={dbName} className="bg-[#1a2b34] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h6 className="text-white font-medium">{dbName}</h6>
            <span className="text-xs px-2 py-0.5 bg-[#344752] rounded-full text-gray-300">
              {dbData.hits.length} hits
            </span>
          </div>
          {dbData.hits.map((hit, index) => {
            const hitKey = `${dbName}-${hit.target_id}`;
            return (
              <div key={index} className="border border-[#344752] rounded-lg p-3 mt-3">
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
                    onClick={() => handleVisualize(hit, dbName)}
                    disabled={isEvaluating[hitKey]}
                    className="bg-[#13a4ec] hover:bg-[#0d8bc4] text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {isEvaluating[hitKey] ? 'Loading...' : 'Visualize Structure'}
                  </button>
                </div>

                {visualizedHits[hitKey] && (
                  <div className="bg-[#1a2b34] rounded-lg p-3">
                    <>
                      <div
                        id={`viewer-${hitKey}`}
                        className="w-full h-[300px] rounded-lg mb-3 bg-[#1a2b34]"
                        ref={(el) => {
                          if (el) {
                            initViewer(hitKey, visualizedHits[hitKey]);
                          }
                        }}
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
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default FoldSeekResults; 