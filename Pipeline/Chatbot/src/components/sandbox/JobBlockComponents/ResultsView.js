import FoldSeekResults from '../../result-viewers/FoldSeekResults';
import SequenceGenerationResults from '../../result-viewers/SequenceGenerationResults';
import PhylogeneticTreeResults from '../../result-viewers/PhylogeneticTreeResults';
import { downloadService } from '../../../services/api';
import BlastResults from '../../BlastResults';
import { BASE_URL } from '../../../config/config';
import { useEffect, useState } from 'react';

const ResultsView = ({ blockType, blockOutput, blockInstanceId, isResultsOpen, onToggleResults, initViewer, formatMetric }) => {
    const [selectedPose, setSelectedPose] = useState(null);

    // Reset selected pose when blockOutput changes
    useEffect(() => {
        if (blockType.id === 'perform_docking' && blockOutput?.docking_poses?.length > 0) {
            setSelectedPose(blockOutput.docking_poses[0]);
        } else {
            setSelectedPose(null);
        }
    }, [blockOutput, blockType.id]);

    const renderDownloadButton = () => {
      if (!blockOutput) return null;
  
      const handleDownload = async () => {
        try {
          let response;
  
          switch (blockType.id) {
            case 'generate_protein':
            case 'sequence_iterator':
              response = await downloadService.downloadSequence(
                blockOutput.sequence,
                `sequence_${blockOutput.id || blockInstanceId}`
              );
              break;
  
            case 'openfold_predict':
            case 'alphafold2_predict':
            case 'esmfold_predict':
              response = await downloadService.downloadStructure(blockOutput.pdb_file);
              break;
  
            case 'perform_docking':
              if (blockOutput.output_dir) {
                response = await downloadService.downloadFilesAsZip([{ path: blockOutput.output_dir, name: `docking_results_${blockInstanceId}` }]);
              } else {
                console.error('No output directory specified for docking results download.');
                return;
              }
              break;            
            case 'colabfold_search':
            case 'ncbi_blast_search':
            case 'local_blast_search':
            case 'search_structure':
              response = await downloadService.downloadSearchResults(
                blockOutput.results,
                blockType.id.includes('search') ? 'similarity' : 'structure'
              );
              break;            case 'predict_binding_sites':
              response = await downloadService.downloadFilesAsZip([
                { path: blockOutput.predictions_csv, name: `binding_sites_predictions_${blockInstanceId}.csv` },
                { path: blockOutput.result_path, name: `p2rank_results_${blockInstanceId}` }
              ]);
              break;

            case 'build_phylogenetic_tree':
              if (blockOutput.tree_data?.files) {
                response = await downloadService.downloadFilesAsZip([
                  { path: blockOutput.tree_data.files.tree_file, name: `phylogenetic_tree_${blockInstanceId}.nwk` },
                  { path: blockOutput.tree_data.files.alignment_file, name: `alignment_${blockInstanceId}.fasta` }
                ]);
              } else {
                console.error('No tree files available for download.');
                return;
              }
              break;
  
            default:
              console.error('Unknown block type for download:', blockType.id);
              return;
          }
  
          downloadService.handleFileDownload(response);
        } catch (error) {
          console.error('Error downloading file:', error);
          if (error.response) {
            console.error('Error response:', error.response.data);
          }
        }
      };
  
      return (
        <button
          onClick={handleDownload}
          className="mt-2 px-3 py-1 bg-[#13a4ec] text-white rounded text-sm hover:bg-[#0f8fd1]"
        >
          Download Results
        </button>
      );
    };
    const viewerDomId = `viewer-${blockInstanceId}`;

    useEffect(() => {
        if (isResultsOpen && initViewer && blockOutput?.pdb_file && 
            (blockType.id === 'openfold_predict' || blockType.id === 'alphafold2_predict' || blockType.id === 'esmfold_predict')) {
            
            const fetchPdbContent = async (filePath) => {
                try {
                    const response = await fetch(`${BASE_URL}/api/pdb-content?filePath=${encodeURIComponent(filePath)}`);
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to fetch PDB content: ${response.status} ${response.statusText}. ${errorText}`);
                    }
                    const pdbContent = await response.text();
                    if (pdbContent) {
                        initViewer(viewerDomId, pdbContent, blockInstanceId);
                    } else {
                        initViewer(viewerDomId, null, blockInstanceId, 'Fetched PDB content is empty.');
                    }
                } catch (error) {
                    console.error('Error fetching PDB content:', error);
                    initViewer(viewerDomId, null, blockInstanceId, `Error fetching PDB: ${error.message}`);
                }
            };

            fetchPdbContent(blockOutput.pdb_file);
        } else if (isResultsOpen && initViewer && !blockOutput?.pdb_file && 
                   (blockType.id === 'openfold_predict' || blockType.id === 'alphafold2_predict' || blockType.id === 'esmfold_predict')) {
            initViewer(viewerDomId, null, blockInstanceId, 'PDB file path missing in block output.');
        }
    }, [isResultsOpen, blockOutput, blockType.id, blockInstanceId, initViewer, viewerDomId]);    // Separate effect for docking pose selection to avoid conflicts
    useEffect(() => {
        if (isResultsOpen && initViewer && blockType.id === 'perform_docking') {
            if (blockOutput?.docking_poses?.length > 0) {
                // Auto-select first pose if none selected
                if (!selectedPose) {
                    setSelectedPose(blockOutput.docking_poses[0]);
                    return; // Let the next effect cycle handle the viewer initialization
                }
                
                // Initialize viewer with selected pose
                if (selectedPose && selectedPose.complex_pdb_file) {
                    const fetchPdbContent = async (filePath) => {
                        try {
                            const response = await fetch(`${BASE_URL}/api/pdb-content?filePath=${encodeURIComponent(filePath)}`);
                            if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`Failed to fetch PDB content: ${response.status} ${response.statusText}. ${errorText}`);
                            }
                            const pdbContent = await response.text();
                            if (pdbContent) {
                                // Use requestAnimationFrame for better timing with DOM updates
                                requestAnimationFrame(() => {
                                    initViewer(viewerDomId, pdbContent, blockInstanceId);
                                });
                            } else {
                                initViewer(viewerDomId, null, blockInstanceId, 'Fetched PDB content for pose is empty.');
                            }
                        } catch (error) {
                            console.error('Error fetching PDB content for pose:', error);
                            initViewer(viewerDomId, null, blockInstanceId, `Error fetching PDB for pose: ${error.message}`);
                        }
                    };
                    fetchPdbContent(selectedPose.complex_pdb_file);
                }
            }
        }
    }, [isResultsOpen, blockType.id, blockInstanceId, initViewer, viewerDomId, selectedPose, blockOutput?.docking_poses]);

    const renderResults = () => {
      if (!blockOutput) return null;
  
      switch (blockType.id) {
        case 'sequence_iterator':
          return (
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">Sequence Iterator Results</h3>
                {blockOutput.progress && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                      <span>Progress: {blockOutput.progress.completed} of {blockOutput.progress.total} sequences</span>
                      <span>{blockOutput.progress.remaining} remaining</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(blockOutput.progress.completed / blockOutput.progress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="bg-[#1a2a33] p-3 rounded-lg">
                  <div className="text-sm text-gray-300 mb-2">{blockOutput.info}</div>
                  <div className="font-mono text-sm text-white whitespace-pre-wrap break-all">
                    {blockOutput.sequence}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                {renderDownloadButton()}
              </div>
            </div>
          );
  
        case 'generate_protein':
          return (
            <div className="bg-[#1a2b34] rounded-lg p-3">
              <SequenceGenerationResults sequence={blockOutput.sequence} info={blockOutput.info} />
              {renderDownloadButton()}
            </div>
          );        case 'openfold_predict':
        case 'alphafold2_predict':
        case 'esmfold_predict':
          return (
            <div className="bg-[#1a2b34] rounded-lg p-3">
              <div
                key={`viewer-${blockInstanceId}-${blockType.id}`}
                id={viewerDomId}
                className="nodrag relative w-full h-[400px] rounded-lg mb-3 bg-gray-800 border border-gray-700 molstar-viewer-container overflow-hidden"
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
              {blockOutput.metrics && (
                <div className="grid grid-cols-2 gap-3 bg-[#1a2b34] p-3 rounded-lg">
                  {Object.entries(blockOutput.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-300 text-sm capitalize">{key}:</span>
                      <span className="text-[#13a4ec] text-sm font-medium">{formatMetric(value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {renderDownloadButton()}
            </div>
          );
  
        case 'perform_docking':
            if (!blockOutput.docking_poses || blockOutput.docking_poses.length === 0) {
                return <div className="text-white p-3">No docking poses found.</div>;
            }
            return (
                <div className="bg-[#1a2b34] rounded-lg p-3">
                    <h3 className="text-lg font-semibold text-white mb-2">Docking Results</h3>
                    <div className="flex gap-4">                        <div className="flex-1">
                            <div
                                key={`viewer-${blockInstanceId}-${selectedPose?.mode || 'none'}`}
                                id={viewerDomId}
                                className="nodrag relative w-full h-[400px] rounded-lg mb-3 bg-gray-800 border border-gray-700 molstar-viewer-container overflow-hidden"
                            />
                        </div>
                        <div className="w-1/3 max-h-[420px] overflow-y-auto custom-scrollbar pr-2">
                            {blockOutput.docking_poses.map((pose) => (
                                <div
                                    key={pose.mode}
                                    onClick={() => setSelectedPose(pose)}
                                    className={`p-2 mb-2 rounded-md cursor-pointer transition-all ${selectedPose?.mode === pose.mode ? 'bg-[#13a4ec] text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                >
                                    <p className="font-semibold">Mode {pose.mode}</p>
                                    <p className="text-xs">Affinity: {formatMetric(pose.affinity)} kcal/mol</p>
                                    <p className="text-xs">RMSD L.B.: {formatMetric(pose.rmsd_lb)} Å</p>
                                    <p className="text-xs">RMSD U.B.: {formatMetric(pose.rmsd_ub)} Å</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end mt-3">
                        {renderDownloadButton()} 
                    </div>
                </div>
            );
  
        case 'colabfold_search':
        case 'ncbi_blast_search':
        case 'local_blast_search':
          return blockOutput.results ? (
            <div className="flex flex-col bg-[#1a2b34] rounded-lg ">
              <div className="flex justify-center">
                {renderDownloadButton()}
              </div>
              <BlastResults results={blockOutput.results} />
            </div>
          ) : null;        case 'search_structure':
          return blockOutput.results ? (
            <div className="bg-[#1a2b34] rounded-lg p-3">
              <div className="text-white text-sm mb-2">Search Results:</div>
              <FoldSeekResults results={blockOutput.results} originalPdbPath={blockOutput.pdb_file} initViewer={initViewer} />
              {renderDownloadButton()}
            </div>
          ) : null;

        case 'predict_binding_sites':
          return (
            <div className="bg-[#1a2b34] rounded-lg p-3">
              <h3 className="text-lg font-semibold text-white mb-3">Binding Site Predictions</h3>
              
              {/* Summary Statistics */}
              {blockOutput.summary && (
                <div className="mb-4 p-3 bg-[#0f1419] rounded-lg">
                  <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Sites:</span>
                      <span className="text-white font-medium">{blockOutput.summary.total_sites}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Max Score:</span>
                      <span className="text-white font-medium">{formatMetric(blockOutput.summary.max_score)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Min Score:</span>
                      <span className="text-white font-medium">{formatMetric(blockOutput.summary.min_score)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Avg Score:</span>
                      <span className="text-white font-medium">{formatMetric(blockOutput.summary.avg_score)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Binding Sites List */}
              {blockOutput.binding_sites && blockOutput.binding_sites.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Predicted Binding Sites</h4>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                    {blockOutput.binding_sites.map((site, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          site.rank === 1 ? 'bg-green-900/30 border-green-500' :
                          site.rank === 2 ? 'bg-blue-900/30 border-blue-500' :
                          site.rank === 3 ? 'bg-yellow-900/30 border-yellow-500' :
                          'bg-gray-900/30 border-gray-500'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              site.rank === 1 ? 'bg-green-600 text-white' :
                              site.rank === 2 ? 'bg-blue-600 text-white' :
                              site.rank === 3 ? 'bg-yellow-600 text-black' :
                              'bg-gray-600 text-white'
                            }`}>
                              #{site.rank}
                            </span>
                            <span className="text-white font-semibold">{site.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[#13a4ec] font-bold text-lg">{formatMetric(site.score)}</div>
                            <div className="text-xs text-gray-300">Score</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-300">Probability:</span>
                            <span className="text-white ml-1">{formatMetric(site.probability)}</span>
                          </div>
                          <div>
                            <span className="text-gray-300">SAS Points:</span>
                            <span className="text-white ml-1">{site.sas_points}</span>
                          </div>
                          <div>
                            <span className="text-gray-300">Surface Atoms:</span>
                            <span className="text-white ml-1">{site.surf_atoms}</span>
                          </div>
                        </div>
                          <div className="mt-2 text-xs">
                          <div className="text-gray-300 mb-1">Center Coordinates:</div>
                          <div className="font-mono text-white bg-black/20 p-2 rounded">
                            X: {formatMetric(site.center_x)}, Y: {formatMetric(site.center_y)}, Z: {formatMetric(site.center_z)}
                          </div>
                        </div>
                        
                        {site.docking_box && (
                          <div className="mt-2 text-xs">
                            <div className="text-gray-300 mb-1">Docking Box Dimensions:</div>
                            <div className="font-mono text-white bg-black/20 p-2 rounded">
                              <div>Size: {formatMetric(site.docking_box.size_x)} × {formatMetric(site.docking_box.size_y)} × {formatMetric(site.docking_box.size_z)} Å</div>
                              <div className="mt-1 text-xs text-gray-400">
                                Center: ({formatMetric(site.docking_box.center_x)}, {formatMetric(site.docking_box.center_y)}, {formatMetric(site.docking_box.center_z)})
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {site.residue_ids && (
                          <div className="mt-2 text-xs">
                            <div className="text-gray-300 mb-1">Residues:</div>
                            <div className="font-mono text-white bg-black/20 p-2 rounded text-wrap break-all">
                              {site.residue_ids}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}              {/* Top Site Highlight */}
              {blockOutput.top_site && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-400 mb-2">🎯 Top Binding Site</h4>
                  <div className="text-sm text-white">
                    <div className="mb-1">
                      <strong>{blockOutput.top_site.name}</strong> - Score: <span className="text-green-400 font-bold">{formatMetric(blockOutput.top_site.score)}</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Center: ({formatMetric(blockOutput.top_site.center_x)}, {formatMetric(blockOutput.top_site.center_y)}, {formatMetric(blockOutput.top_site.center_z)})
                    </div>
                    {blockOutput.top_site.docking_box && (
                      <div className="text-xs text-gray-300 mt-1">
                        Docking Box: {formatMetric(blockOutput.top_site.docking_box.size_x)} × {formatMetric(blockOutput.top_site.docking_box.size_y)} × {formatMetric(blockOutput.top_site.docking_box.size_z)} Å
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-3">
                {renderDownloadButton()}
              </div>            </div>
          );

        case 'build_phylogenetic_tree':
          return (
            <div className="p-4">
              <PhylogeneticTreeResults 
                treeData={blockOutput.tree_data}
                alignmentData={blockOutput.alignment_data}
                metadata={blockOutput.metadata}
              />
              <div className="mt-4 flex justify-end">
                {renderDownloadButton()}
              </div>
            </div>
          );
  
        default:
          return null;
      }
    };
  
    return (
      <>
        {blockOutput && (
          <div className="mt-2">
            <button
              onClick={onToggleResults}
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {isResultsOpen ? 'Hide Results' : 'View Results'}
            </button>
          </div>
        )}
  
        {isResultsOpen && blockOutput && (
          <div 
            className="mt-4 border-t border-white/10 pt-4 overflow-y-auto custom-scrollbar results-container"
            onWheel={(e) => e.stopPropagation()}
          >
            {renderResults()}
          </div>
        )}
      </>
    );
  };
  export default ResultsView;