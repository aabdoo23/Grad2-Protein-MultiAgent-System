import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockPalette from './BlockPalette';
import WorkspaceSurface from './WorkspaceSurface';
import JobManager from '../JobManager';
import { downloadService, jobService } from '../../services/api';
import { blockTypes } from './config/blockTypes';
import useWorkspaceStore from '../../store/workspaceStore';
import { AWAIT_TIME } from '../../config/config';

// Mol* imports
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import 'molstar/build/viewer/molstar.css';

// Helper function (can be moved to a utils file later)
const formatMetric = (value) => {
  if (typeof value === 'number') {
    return value.toFixed(2); // Example: format to 2 decimal places
  }
  return value; // Return as is if not a number
};

const SandboxPage = () => {
  // Get state and actions from Zustand store
  const blocks = useWorkspaceStore(state => state.blocks);
  const connections = useWorkspaceStore(state => state.connections);
  const addBlockToStore = useWorkspaceStore(state => state.addBlock);
  const connectBlocksInStore = useWorkspaceStore(state => state.connectBlocks);
  const updateBlockInStore = useWorkspaceStore(state => state.updateBlock);
  const deleteBlockInStore = useWorkspaceStore(state => state.deleteBlock);
  const deleteConnectionInStore = useWorkspaceStore(state => state.deleteConnection);

  const [blockOutputs, setBlockOutputs] = useState({});
  const blockOutputsRef = useRef(blockOutputs);
  const [isAutomate, setIsAutomate] = useState(false);
  const [downloadSettings, setDownloadSettings] = useState(() => {
    const saved = localStorage.getItem('downloadSettings');
    return saved ? JSON.parse(saved) : { autoSave: false, location: '' };
  });
  const loopQueuedRef = useRef(false);
  const [loopConfig, setLoopConfig] = useState({
    isEnabled: false,
    startBlockId: null,
    endBlockId: null,
    iterationType: 'count', // 'count' or 'sequence'
    iterationCount: 1,
    sequenceBlockId: null,
    currentIteration: 0
  });

  // --- NEW: Track last completed block for automation chaining ---
  const [lastCompletedBlockId, setLastCompletedBlockId] = useState(null);
  const lastCompletedBlockIdRef = useRef(null);

  useEffect(() => {
    lastCompletedBlockIdRef.current = lastCompletedBlockId;
  }, [lastCompletedBlockId]);

  useEffect(() => {
    if (loopConfig.isEnabled) {
      setIsAutomate(true);
    }
  }, [loopConfig.isEnabled]);
  const jobManager = useRef(new JobManager());

  const molstarPlugins = useRef({}); // To store Mol* instances { viewerId: plugin }

  // Update refs whenever their corresponding states change
  useEffect(() => {
    blockOutputsRef.current = blockOutputs;
  }, [blockOutputs]);

  // Cleanup Mol* instances on component unmount
  useEffect(() => {
    const plugins = molstarPlugins.current;
    return () => {
      Object.values(plugins).forEach(plugin => plugin?.dispose());
      molstarPlugins.current = {};
    };
  }, []);

  const initViewer = useCallback(async (viewerId, pdbData, blockId, errorMsg = null) => {
    const domElementId = viewerId || `viewer-${blockId}`;
    const existingElement = document.getElementById(domElementId);
    if (!existingElement) {
      console.error(`initViewer: DOM element with ID '${domElementId}' not found.`);
      return;
    }

    // Dispose existing plugin for this ID if it exists
    if (molstarPlugins.current[domElementId]) {
      console.log(`Disposing existing Mol* plugin for ${domElementId}`);
      molstarPlugins.current[domElementId].dispose();
      delete molstarPlugins.current[domElementId];
    }

    existingElement.innerHTML = ''; // Clear previous content (e.g., error messages or old viewer)

    if (errorMsg) {
      console.error(`Error for viewer '${domElementId}': ${errorMsg}`);
      existingElement.innerHTML = `<p style="color:red; text-align:center; padding:10px;">${errorMsg}</p>`;
      return;
    }

    if (!pdbData) {
      console.log(`initViewer (${domElementId}): No PDB data provided.`);
      existingElement.innerHTML = '<p style="color:orange; text-align:center; padding:10px;">No PDB data to display.</p>';
      return;
    }

    try {
      console.log(`Initializing Mol* viewer for ID '${domElementId}' with received PDB data.`);
      const spec = DefaultPluginUISpec();
      spec.layout = {
        ...(spec.layout || {}),
        initial: {
          ...(spec.layout?.initial || {}),
          isExpanded: false,
          showControls: false,
        },
      };

      const plugin = await createPluginUI(existingElement, spec);
      molstarPlugins.current[domElementId] = plugin;

      const data = await plugin.builders.data.rawData({ data: pdbData, label: blockId });
      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
      await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');

      console.log(`Mol* viewer initialized and PDB loaded for '${domElementId}'`);

    } catch (e) {
      console.error(`Error initializing Mol* for '${domElementId}':`, e);
      if (molstarPlugins.current[domElementId]) {
        molstarPlugins.current[domElementId].dispose();
        delete molstarPlugins.current[domElementId];
      }
      existingElement.innerHTML = '<p style="color:red; text-align:center; padding:10px;">Failed to load 3D structure into viewer.</p>';
    }
  }, []);

  // Add a new block to the workspace (this now calls the store action)
  const addBlock = (newBlockInstance) => {
    addBlockToStore(newBlockInstance);
  };

  // Update block parameters (can still be a local utility if it then calls store)
  const updateBlockParameters = (blockId, parameters) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      updateBlockInStore(blockId, { parameters: { ...block.parameters, ...parameters } });
    }
  };

  // Update block properties (this now calls the store action)
  const updateBlock = (blockId, updates) => {
    updateBlockInStore(blockId, updates);
  };

  // Delete a block and its connections (this now calls the store action)
  const deleteBlock = (blockId) => {
    // Also dispose Mol* plugin if a block is deleted
    const viewerDomId = `viewer-${blockId}`;
    if (molstarPlugins.current[viewerDomId]) {
      console.log(`Disposing Mol* plugin for deleted block ${blockId}`);
      molstarPlugins.current[viewerDomId].dispose();
      delete molstarPlugins.current[viewerDomId];
    }
    deleteBlockInStore(blockId);
  };

  // Add this function after the deleteBlock function
  const clearOutputs = () => {
    // Reset all block statuses to 'idle'
    blocks.forEach(block => updateBlockInStore(block.id, { status: 'idle' }));

    // Clear all block outputs
    setBlockOutputs({});

    console.log('All block outputs cleared and statuses reset');
  };

  // Add loop control functions
  const startLoop = () => {
    if (!loopConfig.startBlockId || !loopConfig.endBlockId) {
      console.error('Start and end blocks must be selected for loop');
      return;
    }

    if (loopConfig.iterationType === 'count' && loopConfig.iterationCount < 1) {
      console.error('Iteration count must be at least 1');
      return;
    }

    if (loopConfig.iterationType === 'sequence' && !loopConfig.sequenceBlockId) {
      console.error('Sequence block must be selected for sequence-based iteration');
      return;
    }

    setLoopConfig(prev => ({
      ...prev,
      isEnabled: true,
      currentIteration: 0
    }));

    // Start the loop by running the start block
    runBlock(loopConfig.startBlockId);
  };

  const stopLoop = () => {
    // Reset loop configuration
    setLoopConfig(prev => ({
      ...prev,
      isEnabled: false,
      currentIteration: 0
    }));

    // Ensure all blocks in the loop are properly reset
    if (loopConfig.startBlockId && loopConfig.endBlockId) {
      resetBlocksBetween(loopConfig.startBlockId, loopConfig.endBlockId);
      resetOutputsBetween(loopConfig.startBlockId, loopConfig.endBlockId);
    }

    // Reset automation state if it was only enabled for the loop
    if (!isAutomate) {
      setIsAutomate(false);
    }
  };

  // Add loop configuration UI
  // const renderLoopControls = () => (
  //   <div className="flex items-center gap-4 bg-[#233c48] px-4 py-2 rounded-lg border border-[#344854]">
  //     <div className="flex items-center gap-3">
  //       <span className="text-white text-sm font-medium">Loop</span>
  //       <label className="relative inline-flex items-center cursor-pointer">
  //         <input
  //           type="checkbox"
  //           className="sr-only peer"
  //           checked={loopConfig.isEnabled}
  //           onChange={() => setLoopConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
  //         />
  //         <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
  //       </label>
  //     </div>
  //     {loopConfig.isEnabled && (
  //       <div className="flex items-center gap-3">
  //         <select
  //           className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
  //           value={loopConfig.startBlockId || ''}
  //           onChange={(e) => setLoopConfig(prev => ({ ...prev, startBlockId: e.target.value }))}
  //         >
  //           <option value="">Select Start Block</option>
  //           {blocks.map(b => (
  //             <option key={`start-${b.id}`} value={b.id}>
  //               {b.type} - ({b.id})
  //             </option>
  //           ))}
  //         </select>
  //         <select
  //           className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
  //           value={loopConfig.endBlockId || ''}
  //           onChange={(e) => setLoopConfig(prev => ({ ...prev, endBlockId: e.target.value }))}
  //         >
  //           <option value="">Select End Block</option>
  //           {blocks.map(b => (
  //             <option key={`end-${b.id}`} value={b.id}>
  //               {b.type} - ({b.id})
  //             </option>
  //           ))}
  //         </select>
  //         <select
  //           className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
  //           value={loopConfig.iterationType}
  //           onChange={(e) => setLoopConfig(prev => ({ ...prev, iterationType: e.target.value }))}
  //         >
  //           <option value="count">Count</option>
  //           <option value="sequence">Sequence</option>
  //         </select>
  //         {loopConfig.iterationType === 'count' ? (
  //           <input
  //             type="number"
  //             min="1"
  //             value={loopConfig.iterationCount}
  //             onChange={(e) => setLoopConfig(prev => ({ ...prev, iterationCount: parseInt(e.target.value) }))}
  //             className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200 w-20"
  //           />
  //         ) : (
  //           <select
  //             className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
  //             value={loopConfig.sequenceBlockId || ''}
  //             onChange={(e) => setLoopConfig(prev => ({ ...prev, sequenceBlockId: e.target.value }))}
  //           >
  //             <option value="">Select Sequence Block</option>
  //             {blocks
  //               .filter(b => b.type === 'sequence_iterator')
  //               .map(b => (
  //                 <option key={b.id} value={b.id}>
  //                   {b.id}
  //                 </option>
  //               ))}
  //           </select>
  //         )}
  //         <button
  //           onClick={startLoop}
  //           className="px-4 py-1.5 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1] transition-colors duration-200 flex items-center gap-2"
  //         >
  //           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  //           </svg>
  //           Start Loop
  //         </button>
  //         <button
  //           onClick={stopLoop}
  //           className="px-4 py-1.5 bg-[#1a2c35] text-white border border-[#344854] rounded-lg text-sm hover:bg-[#233c48] transition-colors duration-200 flex items-center gap-2"
  //         >
  //           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  //             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 15l4-4m0" />
  //           </svg>
  //           Stop Loop
  //         </button>
  //       </div>
  //     )}
  //   </div>
  // );

  // Add helper functions for resetting blocks and outputs
  const resetBlocksBetween = (startBlockId, endBlockId) => {
    const startIndex = blocks.findIndex(b => b.id === startBlockId);
    const endIndex = blocks.findIndex(b => b.id === endBlockId);

    if (startIndex !== -1 && endIndex !== -1) {
      for (let i = startIndex; i <= endIndex; i++) {
        if (blocks[i]) {
          // Only update the status while preserving all other properties
          updateBlockInStore(blocks[i].id, {
            status: 'idle',
            // Preserve other essential properties
            // position: blocks[i].position,
            type: blocks[i].type,
            blockTypeId: blocks[i].blockTypeId,
            parameters: blocks[i].parameters
          });
        }
      }
    }
  };

  const resetOutputsBetween = (startBlockId, endBlockId) => {
    const startIndex = blocks.findIndex(b => b.id === startBlockId);
    const endIndex = blocks.findIndex(b => b.id === endBlockId);

    if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
      setBlockOutputs(prevOutputs => {
        const newBlockOutputs = { ...prevOutputs };
        for (let i = startIndex; i <= endIndex; i++) {
          if (blocks[i] && blocks[i].id) {
            delete newBlockOutputs[blocks[i].id];
          }
        }
        return newBlockOutputs;
      });
    } else {
      console.warn("resetOutputsBetween: Could not reset outputs, start or end block not found or invalid range. Start:", startBlockId, "End:", endBlockId);
    }
  };

  // Add this function after the stopLoop function
  const handleDownloadSettingsChange = (settings) => {
    setDownloadSettings(settings);
    localStorage.setItem('downloadSettings', JSON.stringify(settings));
  };

  // Add this function after the renderLoopControls function
  // const renderDownloadSettings = () => (
  //   <div className="flex items-center gap-4 bg-[#233c48] px-4 py-2 rounded-lg border border-[#344854]">
  //     <div className="flex items-center gap-3">
  //       <span className="text-white text-sm font-medium">Auto-save Downloads</span>
  //       <label className="relative inline-flex items-center cursor-pointer">
  //         <input
  //           type="checkbox"
  //           className="sr-only peer"
  //           checked={downloadSettings.autoSave}
  //           onChange={(e) => handleDownloadSettingsChange({
  //             ...downloadSettings,
  //             autoSave: e.target.checked
  //           })}
  //         />
  //         <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
  //       </label>
  //     </div>
  //     {downloadSettings.autoSave && (
  //       <div className="flex items-center gap-2">
  //         <input
  //           type="text"
  //           value={downloadSettings.location}
  //           onChange={(e) => handleDownloadSettingsChange({
  //             ...downloadSettings,
  //             location: e.target.value
  //           })}
  //           placeholder="Download location..."
  //           className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200 w-64"
  //         />
  //         <button
  //           onClick={() => {
  //             const input = document.createElement('input');
  //             input.type = 'file';
  //             input.webkitdirectory = true;
  //             input.onchange = (e) => {
  //               const path = e.target.files[0]?.path;
  //               if (path) {
  //                 handleDownloadSettingsChange({
  //                   ...downloadSettings,
  //                   location: path
  //                 });
  //               }
  //             };
  //             input.click();
  //           }}
  //           className="px-3 py-1.5 bg-[#1a2c35] text-white border border-[#344854] rounded-lg text-sm hover:bg-[#233c48] transition-colors duration-200"
  //         >
  //           Browse
  //         </button>
  //       </div>
  //     )}
  //   </div>
  // );

  const getNextBlocksInChain = (currentBlockId) => {
    const nextBlocks = blocks.filter(block => {
      const blockConnection = connections[block.id];
      if (!blockConnection) return false;
      
      // Check if any input handle has a connection from the current block
      return Object.entries(blockConnection).some(([handle, connections]) => {
        // Handle both array and single connection for backward compatibility
        const connectionArray = Array.isArray(connections) ? connections : [connections];
        return connectionArray.some(conn => conn && conn.source === currentBlockId);
      });
    });

    if (nextBlocks.length > 0) {
      console.log('Next blocks:', nextBlocks.map(b => b.id).join(', '));
      return nextBlocks;
    }
    console.log('No next blocks found - end of sequence');
    return [];
  };

  const runBlock = async (blockId, params = null) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    setBlockOutputs(prev => ({
      ...prev,
      [blockId]: null
    }));
    console.log('Running block:', block.type);

    updateBlockInStore(blockId, { status: 'running' });

    if (params) {
      setBlockOutputs(prev => ({
        ...prev,
        [blockId]: params
      }));
    }

    if (block.type === 'multi_download') {
      const conns = connections[blockId] || {};
      console.log('multi_download connections:', conns);
      console.log('blocks:', blocks.map(b => ({ id: b.id, status: b.status })));
      
      // Check all connections for pending blocks
      const pending = Object.entries(conns).flatMap(([handle, connections]) => {
        const connectionArray = Array.isArray(connections) ? connections : [connections];
        return connectionArray.filter(conn => 
          conn && blocks.find(b => b.id === conn.source)?.status !== 'completed'
        );
      });
      
      if (pending.length) {
        console.log('Waiting on inputs for multi_download:', pending);
        return;
      }

      // Collect all download items from all connections
      const downloadItems = Object.entries(conns).flatMap(([inputType, connections]) => {
        const connectionArray = Array.isArray(connections) ? connections : [connections];
        return connectionArray.map(conn => {
          if (!conn) return null;
          // const sourceBlock = blocks.find(b => b.id === conn.source);
          const output = blockOutputsRef.current[conn.source];
          return { outputType: conn.sourceHandle, data: output };
        }).filter(Boolean);
      });

      const missingData = downloadItems.filter(item => !item.data);
      if (missingData.length > 0) {
        console.error('Missing data for multi-download:', missingData);
        updateBlockInStore(blockId, { status: 'failed' });
        return;
      }

      try {
        const resp = await downloadService.multiDownload({ items: downloadItems, downloadSettings });
        if (resp.success && resp.zipUrl) {
          if (!downloadSettings.autoSave) {
            const a = document.createElement('a');
            a.href = resp.zipUrl;
            a.download = `batch_download_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          updateBlockInStore(blockId, { status: 'completed' });
          setBlockOutputs(prev => ({
            ...prev,
            [blockId]: {
              ...prev[blockId],
              downloadInfo: downloadSettings.autoSave ? {
                saved: true,
                path: downloadSettings.location,
                filename: `batch_download_${Date.now()}.zip`
              } : {
                saved: false,
                downloaded: true
              }
            }
          }));
          if (loopConfig.isEnabled && blockId === loopConfig.endBlockId) {
            setLoopConfig(prev => {
              const nextIteration = prev.currentIteration + 1; // Increment currentIteration first for this check
              const sequenceBlock = blocks.find(b => b.id === prev.sequenceBlockId);
              const hasMoreInSequence = prev.iterationType === 'sequence' && sequenceBlock &&
                sequenceBlock.parameters &&
                Array.isArray(sequenceBlock.parameters.sequences) &&
                sequenceBlock.parameters.sequences.length > 0;

              const shouldContinue = prev.iterationType === 'count'
                ? nextIteration <= prev.iterationCount // Use <= to allow the last iteration
                : hasMoreInSequence;

              if (!shouldContinue) {
                console.log('Loop completed or sequence finished.');
                // stopLoop(); // Keep isEnabled true to allow normal chain from endBlock
                // Instead of full stopLoop, just mark it as no longer actively iterating internally
                return { ...prev, isEnabled: false, currentIteration: nextIteration - 1 }; // -1 because we incremented for check
              }

              // Reset relevant blocks for the next iteration
              resetBlocksBetween(prev.startBlockId, prev.endBlockId);
              resetOutputsBetween(prev.startBlockId, prev.endBlockId);

              console.log(`Loop: Preparing for next iteration ${nextIteration}. Start: ${prev.startBlockId}`);

              // Debounce or delay the start of the next iteration slightly
              // to prevent rapid-fire execution and allow state updates to settle.
              if (!loopQueuedRef.current) {
                loopQueuedRef.current = true;
                setTimeout(() => {
                  loopQueuedRef.current = false;
                  console.log(`Loop: Running start block ${prev.startBlockId} for iteration ${nextIteration}`);
                  runBlock(prev.startBlockId); // Run the start block of the loop
                }, 100); // Reduced delay
              }
              return { ...prev, currentIteration: nextIteration }; // Update to the actual next iteration
            });
          } else if (isAutomate && blockId !== loopConfig.endBlockId) { // Only chain if not the end of an active loop
            // Standard automation chain if not the end of an active loop iteration
            console.log('Standard automation: Running next blocks in chain from multi_download');
            const nextBlocks = getNextBlocksInChain(blockId);
            if (nextBlocks.length > 0) {
              setTimeout(() => {
                nextBlocks.forEach(nextBlock => {
                  if (nextBlock && nextBlock.id) {
                    runBlock(nextBlock.id, { ...blockOutputsRef.current[blockId] });
                  }
                });
              }, AWAIT_TIME);
            } else {
              console.log('Pipeline sequence completed after multi_download.');
            }
          }
        } else {
          updateBlockInStore(blockId, { status: 'failed' });
          console.error('Multi-download failed', resp.error);
        }
      } catch (error) {
        updateBlockInStore(blockId, { status: 'failed' });
        console.error('Multi-download execution error:', error);
      }
      return;
    }

    if (block.type === 'sequence_iterator') {
      const sequences = block.parameters.sequences || [];
      const currentIndex = block.parameters.currentIndex || 0;

      if (sequences.length === 0) {
        updateBlockInStore(blockId, { status: 'failed' });
        return;
      }

      const currentSequence = sequences[currentIndex];

      const remainingSequences = [...sequences];
      remainingSequences.splice(currentIndex, 1);

      updateBlockInStore(blockId, {
        status: 'completed',
        parameters: {
          ...block.parameters,
          sequences: remainingSequences,
          currentIndex: 0,
          totalSequences: sequences.length,
          completedSequences: (block.parameters.completedSequences || 0) + 1
        }
      });

      const output = {
        sequence: currentSequence,
        info: `Sequence ${currentIndex + 1} of ${sequences.length}`,
        sequence_name: `sequence_${currentIndex + 1}`,
        progress: {
          completed: (block.parameters.completedSequences || 0) + 1,
          total: block.parameters.totalSequences || sequences.length,
          remaining: remainingSequences.length
        }
      };

      setBlockOutputs(prev => ({
        ...prev,
        [blockId]: output
      }));

      console.log('Sequence iterator output:', output);
      console.log('isAutomate:', isAutomate);

      if (isAutomate) {
        console.log('Automation enabled, running next blocks in sequence iterator chain');
        const nextBlocks = getNextBlocksInChain(blockId);
        if (nextBlocks.length > 0) {
          setTimeout(() => {
            nextBlocks.forEach(nextBlock => {
              if (nextBlock && nextBlock.id) {
                console.log(`Triggering next block ${nextBlock.id} with sequence data`);
                runBlock(nextBlock.id, {
                  sequence: currentSequence,
                  sequence_name: `sequence_${currentIndex + 1}`
                });
              }
            });
          }, 1000);
        } else {
          console.log('No connected blocks found for sequence iterator');
        }
      }

      return;
    }

    const blockInputs = params || {};
    if (!params) {
      const blockConnectionData = connections[blockId];
      if (blockConnectionData) {
        for (const [targetHandle, connections] of Object.entries(blockConnectionData)) {
          // Handle both array and single connection for backward compatibility
          const connectionArray = Array.isArray(connections) ? connections : [connections];
          connectionArray.forEach(conn => {
            if (conn && blockOutputs[conn.source]) {
              const sourceOutput = blockOutputs[conn.source];
              console.log(`Getting ${conn.sourceHandle} from block ${conn.source}:`, sourceOutput);
              switch (conn.sourceHandle) {
                case 'sequence': blockInputs.sequence = sourceOutput.sequence; break;
                case 'structure': blockInputs.pdb_file = sourceOutput.pdb_file; break;
                case 'metrics': blockInputs.metrics = sourceOutput.metrics; break;
                case 'results': blockInputs.results = sourceOutput.results; break;
                default: blockInputs[targetHandle] = sourceOutput;
              }
            }
          });
        }
      }
    }

    console.log(`Running block ${blockId} with inputs:`, blockInputs);

    try {
      const job = {
        id: `job-${Date.now()}`,
        name: block.type,
        function_name: block.type,
        description: blockTypes.find(bt => bt.id === block.type)?.description,
        parameters: {
          ...block.parameters,
          ...blockInputs
        },
        status: 'pending',
        block_id: blockId
      };

      jobManager.current.addJobConfirmation(job);

      const success = await handleConfirmJob(job.id);

      if (!success) {
        updateBlockInStore(blockId, { status: 'failed' });
      }
    } catch (error) {
      console.error('Error running block:', error);
      updateBlockInStore(blockId, { status: 'failed' });
    }
  };

  const handleConfirmJob = async (jobId) => {
    const jobData = jobManager.current.jobList.get(jobId);
    if (!jobData) {
      console.error('Job data not found in jobManager for job ID:', jobId);
      return false;
    }
    const associatedBlockId = jobData.block_id;

    try {
      const response = await jobService.confirmJob(jobId, jobData);
      if (response.success) {
        jobManager.current.removeFromPendingConfirmations(jobId);
        if (response.job && response.job.block_id) {
          pollJobStatus(jobId, response.job.block_id);
        } else if (associatedBlockId) {
          pollJobStatus(jobId, associatedBlockId);
        } else {
          console.warn('No block_id found for job', jobId);
        }
        return true;
      } else {
        console.error('Failed to confirm job:', response.message);
        if (associatedBlockId) updateBlockInStore(associatedBlockId, { status: 'failed' });
        return false;
      }
    } catch (error) {
      console.error('Error confirming job:', error);
      if (associatedBlockId) updateBlockInStore(associatedBlockId, { status: 'failed' });
      return false;
    }
  };

  const pollJobStatus = async (jobId, blockIdForStatusUpdate) => {
    let pollingInterval;

    const checkStatus = async () => {
      try {
        const jobStatus = await jobService.getJobStatus(jobId);

        if (jobStatus.status === 'completed') {
          clearInterval(pollingInterval);

          updateBlockInStore(blockIdForStatusUpdate, { status: 'completed' });

          setBlockOutputs(prev => ({
            ...prev,
            [blockIdForStatusUpdate]: jobStatus.result
          }));

          // --- Instead of triggering next block here, set lastCompletedBlockId ---
          setLastCompletedBlockId(blockIdForStatusUpdate);

          if (loopConfig.isEnabled && blockIdForStatusUpdate === loopConfig.endBlockId && jobStatus.status === 'completed') {
            console.log('Loop logic: End block completed. Evaluating next iteration.');
            const currentLoopIteration = loopConfig.currentIteration; // Iteration that just completed
            const nextIterationNumber = currentLoopIteration + 1;

            const sequenceBlock = blocks.find(b => b.id === loopConfig.sequenceBlockId);
            const hasMoreInSequence = loopConfig.iterationType === 'sequence' && sequenceBlock &&
              sequenceBlock.parameters &&
              Array.isArray(sequenceBlock.parameters.sequences) &&
              sequenceBlock.parameters.sequences.length > 0;

            // For count-based, iterationCount is the total number of iterations.
            // So, if currentIteration (0-indexed) has reached iterationCount - 1, it's the last one.
            const shouldContinueLoop = loopConfig.iterationType === 'count'
              ? currentLoopIteration < loopConfig.iterationCount // Loop while currentIteration < target count
              : hasMoreInSequence;

            if (shouldContinueLoop) {
              console.log(`Loop: Continuing to iteration ${nextIterationNumber}. Max: ${loopConfig.iterationCount}`);

              resetBlocksBetween(loopConfig.startBlockId, loopConfig.endBlockId);
              resetOutputsBetween(loopConfig.startBlockId, loopConfig.endBlockId);

              // Update loopConfig for the next iteration *before* running the start block
              setLoopConfig(prev => ({ ...prev, currentIteration: nextIterationNumber }));

              if (!loopQueuedRef.current) {
                loopQueuedRef.current = true;
                setTimeout(() => {
                  loopQueuedRef.current = false;
                  console.log(`Loop: Running start block ${loopConfig.startBlockId} for iteration ${nextIterationNumber}`);
                  runBlock(loopConfig.startBlockId);
                }, 100); // Small delay before starting next iteration
              }
            } else {
              console.log('Loop: All iterations completed or sequence finished.');
              stopLoop(); // Properly stop the loop now.
              // If there's automation beyond the loop, it would have been handled by the general 'isAutomate' logic after endBlock completed.
            }
          } else if (jobStatus.status === 'failed') { // Handle general failure
            clearInterval(pollingInterval);
            updateBlockInStore(blockIdForStatusUpdate, { status: 'failed' });
            if (loopConfig.isEnabled) {
              console.log('Loop stopped due to block failure within the loop.');
              stopLoop();
            }
          }
        } else if (jobStatus.status === 'failed') { // This is the original 'failed' block from pollJobStatus
          clearInterval(pollingInterval);
          updateBlockInStore(blockIdForStatusUpdate, { status: 'failed' });
          if (loopConfig.isEnabled) {
            console.log('Loop stopped due to block failure (outer check).');
            stopLoop();
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollingInterval);
        updateBlockInStore(blockIdForStatusUpdate, { status: 'failed' });
        if (loopConfig.isEnabled) {
          console.log('Loop stopped due to error');
          stopLoop();
        }
      }
    };

    pollingInterval = setInterval(checkStatus, AWAIT_TIME);
    checkStatus();
  };

  // --- NEW: useEffect to trigger automation chain only after status is updated ---
  useEffect(() => {
    if (!isAutomate || !lastCompletedBlockId) return;
    // Find the block in the latest Zustand state
    const completedBlock = blocks.find(b => b.id === lastCompletedBlockId && b.status === 'completed');
    if (!completedBlock) return;
    // Get next blocks in chain
    const nextBlocks = getNextBlocksInChain(lastCompletedBlockId);
    if (nextBlocks.length > 0) {
      setTimeout(() => {
        nextBlocks.forEach(nextBlock => {
          if (nextBlock && nextBlock.id) {
            // Pass the current block's output to the next block in the chain
            const inputForNextBlock = lastCompletedBlockId === loopConfig.sequenceBlockId
              ? blockOutputsRef.current[lastCompletedBlockId]
              : blockOutputsRef.current[lastCompletedBlockId];
            console.log(`Automated chain (useEffect): Triggering ${nextBlock.id} from ${lastCompletedBlockId}`);
            runBlock(nextBlock.id, inputForNextBlock);
          }
        });
      }, AWAIT_TIME);
    }
    // Reset lastCompletedBlockId so it doesn't retrigger
    setLastCompletedBlockId(null);
  }, [lastCompletedBlockId, isAutomate, blocks, loopConfig.sequenceBlockId]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add this new component for the top bar
  const TopBar = () => (
    <header className="flex flex-col bg-[#111c22]/95 backdrop-blur-sm border-b border-[#233c48]">
      {/* Main bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#13a4ec]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Protein Pipeline Sandbox
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick actions */}
          <button
            onClick={clearOutputs}
            className="px-4 py-2 bg-[#233c48] text-white border border-[#13a4ec] rounded-lg text-sm hover:bg-[#2a4a5a] transition-all duration-200 flex items-center gap-2 group"
            title="Clear all outputs and reset blocks"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#13a4ec] group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Clear Outputs
          </button>

          {/* Settings toggle */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="px-4 py-2 bg-[#233c48] text-white border border-[#344854] rounded-lg text-sm hover:bg-[#2a4a5a] transition-all duration-200 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {/* Collapsible settings panel */}
      {isSettingsOpen && (
        <div className="px-6 py-4 bg-[#1a2c35] border-t border-[#233c48]">
          <div className="flex flex-wrap gap-6">
            {/* Loop Controls */}
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-4 bg-[#233c48] px-4 py-3 rounded-lg border border-[#344854]">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium">Loop</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={loopConfig.isEnabled}
                      onChange={() => setLoopConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
                  </label>
                </div>
                {loopConfig.isEnabled && (
                  <div className="flex flex-wrap gap-3">
                    <select
                      className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
                      value={loopConfig.startBlockId || ''}
                      onChange={(e) => setLoopConfig(prev => ({ ...prev, startBlockId: e.target.value }))}
                    >
                      <option value="">Select Start Block</option>
                      {blocks.map(b => (
                        <option key={`start-${b.id}`} value={b.id}>
                          {b.type} - ({b.id})
                        </option>
                      ))}
                    </select>
                    <select
                      className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
                      value={loopConfig.endBlockId || ''}
                      onChange={(e) => setLoopConfig(prev => ({ ...prev, endBlockId: e.target.value }))}
                    >
                      <option value="">Select End Block</option>
                      {blocks.map(b => (
                        <option key={`end-${b.id}`} value={b.id}>
                          {b.type} - ({b.id})
                        </option>
                      ))}
                    </select>
                    <select
                      className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
                      value={loopConfig.iterationType}
                      onChange={(e) => setLoopConfig(prev => ({ ...prev, iterationType: e.target.value }))}
                    >
                      <option value="count">Count</option>
                      <option value="sequence">Sequence</option>
                    </select>
                    {loopConfig.iterationType === 'count' ? (
                      <input
                        type="number"
                        min="1"
                        value={loopConfig.iterationCount}
                        onChange={(e) => setLoopConfig(prev => ({ ...prev, iterationCount: parseInt(e.target.value) }))}
                        className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200 w-20"
                      />
                    ) : (
                      <select
                        className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
                        value={loopConfig.sequenceBlockId || ''}
                        onChange={(e) => setLoopConfig(prev => ({ ...prev, sequenceBlockId: e.target.value }))}
                      >
                        <option value="">Select Sequence Block</option>
                        {blocks
                          .filter(b => b.type === 'sequence_iterator')
                          .map(b => (
                            <option key={b.id} value={b.id}>
                              {b.id}
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      onClick={startLoop}
                      className="px-4 py-1.5 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1] transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Loop
                    </button>
                    <button
                      onClick={stopLoop}
                      className="px-4 py-1.5 bg-[#1a2c35] text-white border border-[#344854] rounded-lg text-sm hover:bg-[#233c48] transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 15l4-4m0" />
                      </svg>
                      Stop Loop
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Automation toggle */}
            <div className="flex items-center gap-3 bg-[#233c48] px-4 py-2 rounded-lg border border-[#344854]">
              <span className="text-white text-sm font-medium">Automate</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isAutomate} onChange={() => setIsAutomate(!isAutomate)} />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
              </label>
            </div>
            {/* Download Settings */}
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-4 bg-[#233c48] px-4 py-3 rounded-lg border border-[#344854]">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium">Auto-save Downloads</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={downloadSettings.autoSave}
                      onChange={(e) => handleDownloadSettingsChange({
                        ...downloadSettings,
                        autoSave: e.target.checked
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
                  </label>
                </div>
                {downloadSettings.autoSave && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={downloadSettings.location}
                      onChange={(e) => handleDownloadSettingsChange({
                        ...downloadSettings,
                        location: e.target.value
                      })}
                      placeholder="Download location..."
                      className="bg-[#1a2c35] text-white text-sm rounded-lg px-3 py-1.5 border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200 w-64"
                    />
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.webkitdirectory = true;
                        input.onchange = (e) => {
                          const path = e.target.files[0]?.path;
                          if (path) {
                            handleDownloadSettingsChange({
                              ...downloadSettings,
                              location: path
                            });
                          }
                        };
                        input.click();
                      }}
                      className="px-3 py-1.5 bg-[#1a2c35] text-white border border-[#344854] rounded-lg text-sm hover:bg-[#233c48] transition-colors duration-200"
                    >
                      Browse
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );

  return (
    <div className="flex flex-col h-screen bg-[#111c22]">
      <TopBar />
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-1 overflow-hidden">
          <div className="bg-[#1a2b34] border-r border-[#233c48] overflow-y-auto p-4 transition-all duration-100 ease-in-out">
            <BlockPalette blockTypes={blockTypes} />
          </div>

          <div className="flex-1 relative overflow-auto">
            <WorkspaceSurface
              blocks={blocks}
              blockTypes={blockTypes}
              connections={connections}
              addBlock={addBlock}
              connectBlocks={connectBlocksInStore}
              runBlock={runBlock}
              updateBlockParameters={updateBlockParameters}
              blockOutputs={blockOutputs}
              updateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
              deleteConnection={deleteConnectionInStore}
              loopConfig={loopConfig}
              setLoopConfig={setLoopConfig}
              formatMetric={formatMetric}
              initViewer={initViewer}
            />
          </div>
        </div>
      </DndProvider>
    </div>
  );
};

export default SandboxPage; 