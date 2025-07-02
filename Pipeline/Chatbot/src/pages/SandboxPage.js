import { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockPalette from '../components/sandbox/BlockPalette';
import WorkspaceSurface from '../components/sandbox/WorkspaceSurface';
import JobManager from '../components/JobManager';
import { downloadService, jobService } from '../services/api';
import { blockTypes } from '../config/sandbox/blockTypes';
import useWorkspaceStore from '../store/workspaceStore';
import { AWAIT_TIME } from '../config/appConfig';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showErrorToast } from '../services/notificationService';

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
      try {
        molstarPlugins.current[domElementId].dispose();
      } catch (e) {
        console.warn(`Error disposing plugin for ${domElementId}:`, e);
      }
      delete molstarPlugins.current[domElementId];
    }

    // Clear content more safely by removing child nodes
    while (existingElement.firstChild) {
      existingElement.removeChild(existingElement.firstChild);
    }

    if (errorMsg) {
      console.error(`Error for viewer '${domElementId}': ${errorMsg}`);
      const errorElement = document.createElement('p');
      errorElement.style.cssText = 'color:red; text-align:center; padding:10px;';
      errorElement.textContent = errorMsg;
      existingElement.appendChild(errorElement);
      return;
    }

    if (!pdbData) {
      console.log(`initViewer (${domElementId}): No PDB data provided.`);
      const noDataElement = document.createElement('p');
      noDataElement.style.cssText = 'color:orange; text-align:center; padding:10px;';
      noDataElement.textContent = 'No PDB data to display.';
      existingElement.appendChild(noDataElement);
      return;
    }

    try {
      console.log(`Initializing Mol* viewer for ID '${domElementId}' with received PDB data.`);
      
      // Create a container div for the Mol* viewer
      const viewerContainer = document.createElement('div');
      viewerContainer.style.cssText = 'width: 100%; height: 100%;';
      existingElement.appendChild(viewerContainer);
      
      const spec = DefaultPluginUISpec();
      spec.layout = {
        ...(spec.layout || {}),
        initial: {
          ...(spec.layout?.initial || {}),
          isExpanded: false,
          showControls: false,
        },
      };

      const plugin = await createPluginUI(viewerContainer, spec);
      molstarPlugins.current[domElementId] = plugin;

      const data = await plugin.builders.data.rawData({ data: pdbData, label: blockId });
      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
      await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');

      console.log(`Mol* viewer initialized and PDB loaded for '${domElementId}'`);

    } catch (e) {
      console.error(`Error initializing Mol* for '${domElementId}':`, e);
      if (molstarPlugins.current[domElementId]) {
        try {
          molstarPlugins.current[domElementId].dispose();
        } catch (disposeError) {
          console.warn(`Error disposing plugin after init failure:`, disposeError);
        }
        delete molstarPlugins.current[domElementId];
      }
      
      // Clear content and show error
      while (existingElement.firstChild) {
        existingElement.removeChild(existingElement.firstChild);
      }
      const errorElement = document.createElement('p');
      errorElement.style.cssText = 'color:red; text-align:center; padding:10px;';
      errorElement.textContent = 'Failed to load 3D structure into viewer.';
      existingElement.appendChild(errorElement);
    }
  }, []);

  // Add a new block to the workspace (this now calls the store action)
  const addBlock = (newBlockInstance) => {
    addBlockToStore(newBlockInstance);
  };
  // Update block parameters (can still be a local utility if it then calls store)
  const updateBlockParameters = useCallback((blockId, parameters) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      updateBlockInStore(blockId, { parameters: { ...block.parameters, ...parameters } });
    }
  }, [blocks, updateBlockInStore]);
  // Update block properties (this now calls the store action)
  const updateBlock = useCallback((blockId, updates) => {
    updateBlockInStore(blockId, updates);
  }, [updateBlockInStore]);
  // Delete a block and its connections (this now calls the store action)
  const deleteBlock = useCallback((blockId) => {
    // Also dispose Mol* plugin if a block is deleted
    const viewerDomId = `viewer-${blockId}`;
    if (molstarPlugins.current[viewerDomId]) {
      console.log(`Disposing Mol* plugin for deleted block ${blockId}`);
      molstarPlugins.current[viewerDomId].dispose();
      delete molstarPlugins.current[viewerDomId];
    }
    deleteBlockInStore(blockId);
  }, [deleteBlockInStore]);
  const clearBlockOutput = useCallback((blockId) => {
    setBlockOutputs(prev => {
      const newOutputs = { ...prev };
      delete newOutputs[blockId];
      return newOutputs;
    });
  }, []);
  // Add this function after the deleteBlock function
  const clearOutputs = () => {
    // Reset block statuses to 'idle' only for blocks that don't have preserveOnReset
    blocks.forEach(block => {
      if (!block.preserveOnReset) {
        updateBlockInStore(block.id, { status: 'idle' });
      }
    });

    // Clear block outputs only for blocks that don't have preserveOnReset
    setBlockOutputs(prev => {
      const newOutputs = { ...prev };
      blocks.forEach(block => {
        if (!block.preserveOnReset) {
          delete newOutputs[block.id];
        }
      });
      return newOutputs;
    });

    console.log('Block outputs cleared and statuses reset (respecting preserve settings)');
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

  // Add helper functions for resetting blocks and outputs  
  const resetBlocksBetween = (startBlockId, endBlockId) => {
    const startIndex = blocks.findIndex(b => b.id === startBlockId);
    const endIndex = blocks.findIndex(b => b.id === endBlockId);

    if (startIndex !== -1 && endIndex !== -1) {
      for (let i = startIndex; i <= endIndex; i++) {
        if (blocks[i] && !blocks[i].preserveOnReset) {
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
          if (blocks[i] && blocks[i].id && !blocks[i].preserveOnReset) {
            delete newBlockOutputs[blocks[i].id];
          }
        }
        return newBlockOutputs;
      });
    } else {
      console.warn("resetOutputsBetween: Could not reset outputs, start or end block not found or invalid range. Start:", startBlockId, "End:", endBlockId);
    }
  };

  const runBlock = async (blockId, params = null) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;    const currentBlockType = blockTypes.find(bt => bt.id === block.type);
    if (!currentBlockType) {
      console.error(`Unknown block type: ${block.type} for block ID: ${blockId}`);
      showErrorToast(`Cannot run block: Unknown type ${block.type}`);
      updateBlockInStore(blockId, { status: 'failed' });
      return;
    }

    // Process block inputs first (needed for auto-population)
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
              console.log(`Getting ${conn.sourceHandle} from block ${conn.source}:`, sourceOutput);              switch (conn.sourceHandle) {
                case 'sequence':
                  if (sourceOutput.sequence !== undefined) { // If source explicitly provides a single sequence
                    blockInputs.sequence = sourceOutput.sequence;
                    blockInputs.sequence_name = sourceOutput.sequence_name || `sequence_from_${conn.source}`;
                  } else if (sourceOutput.sequences && Array.isArray(sourceOutput.sequences) && sourceOutput.sequences.length > 0) {
                    // Handle output from blocks like file_upload which have a 'sequences' array
                    blockInputs.sequence = sourceOutput.sequences[0]; // Take the first sequence
                    // Attempt to derive a name, e.g., from filePath if available
                    if (sourceOutput.filePath) {
                      const fileName = sourceOutput.filePath.split(/[\\\\/]/).pop(); // Handles both Windows and Unix paths
                      blockInputs.sequence_name = `${fileName}_seq1`;
                    } else {
                      blockInputs.sequence_name = `sequence_1_from_${conn.source}`;
                    }
                  }
                  break;
                case 'structure': 
                  blockInputs.pdb_file = sourceOutput.pdb_file || sourceOutput.filePath; // file_upload uses filePath for structure
                  break;
                case 'molecule': 
                  blockInputs.molecule_file = sourceOutput.molecule_file || sourceOutput.filePath; // file_upload uses filePath for molecule
                  break;
                case 'metrics': blockInputs.metrics = sourceOutput.metrics; break;
                case 'results': blockInputs.results = sourceOutput.results; break;
                case 'blast_results': blockInputs.blast_results = sourceOutput.results; break;
                case 'foldseek_results': blockInputs.foldseek_results = sourceOutput.results; break;
                case 'msa_results': blockInputs.msa_results = sourceOutput.results; break;
                case 'docking_results': blockInputs.docking_results = sourceOutput.results; break;
                case 'binding_sites':
                  // Handle binding sites output - pass through the data for downstream processing
                  blockInputs.binding_sites = sourceOutput.binding_sites;
                  blockInputs.top_site = sourceOutput.top_site;
                  blockInputs.summary = sourceOutput.summary;
                  break;
                default: blockInputs[targetHandle] = sourceOutput;
              }
            }
          });
        }      }
    }

    // Auto-populate docking parameters from binding sites data (before configuration validation)
    let updatedBlock = block;
    if (block.type === 'perform_docking' && blockInputs.top_site) {
      console.log('Auto-populating docking parameters from binding sites data:', blockInputs.top_site);
      
      // Extract coordinates from the top binding site
      const topSite = blockInputs.top_site;
      
      // Update block parameters with binding site coordinates
      const updatedParameters = {
        ...block.parameters,
        center_x: topSite.center_x || 0,
        center_y: topSite.center_y || 0,
        center_z: topSite.center_z || 0
      };
      
      // If the binding site has docking box parameters, use them
      if (topSite.docking_box) {
        updatedParameters.size_x = topSite.docking_box.size_x || block.parameters.size_x || 20;
        updatedParameters.size_y = topSite.docking_box.size_y || block.parameters.size_y || 20;
        updatedParameters.size_z = topSite.docking_box.size_z || block.parameters.size_z || 20;
      }
      
      // Update the block in the store with the new parameters
      updateBlockInStore(blockId, { parameters: updatedParameters });
      
      // Create updated block object for validation below
      updatedBlock = { ...block, parameters: updatedParameters };
      
      console.log('Updated docking parameters:', updatedParameters);
    }

    // Configuration Check (for standard blocks, after auto-population)
    if (block.type !== 'file_upload' && block.type !== 'multi_download' && block.type !== 'sequence_iterator') {
      if (block.type === 'perform_docking') {
        const requiredDockingParams = [
          { name: 'center_x', label: 'Center X' }, { name: 'center_y', label: 'Center Y' }, { name: 'center_z', label: 'Center Z' },
          { name: 'size_x', label: 'Size X' }, { name: 'size_y', label: 'Size Y' }, { name: 'size_z', label: 'Size Z' }
        ];
        for (const param of requiredDockingParams) {
          const value = updatedBlock.parameters[param.name];
          if (value === undefined || value === null || 
              (typeof value === 'string' && value.trim() === '') || 
              isNaN(parseFloat(value))) {
            showErrorToast(`Docking block '${currentBlockType.name}' requires a valid number for configuration: ${param.label}`);
            updateBlockInStore(blockId, { status: 'failed' });
            return;
          }
        }
      }
      // Add other block-specific config checks here if needed (e.g., checking if block.parameters[paramName] is undefined when no default exists in schema)
    }

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
        const resp = await downloadService.multiDownload({ items: downloadItems });
        if (resp.success && resp.zipUrl) {
          const a = document.createElement('a');
          a.href = resp.zipUrl;
          a.download = `batch_download_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          updateBlockInStore(blockId, { status: 'completed' });
          setBlockOutputs(prev => ({
            ...prev,
            [blockId]: {
              ...prev[blockId],
              downloadInfo: {
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
            });          } else if (isAutomate && blockId !== loopConfig.endBlockId) { 
            // Standard automation chain if not the end of an active loop iteration
            // Automation is now handled by the centralized useEffect automation logic
            // Set lastCompletedBlockId to trigger automation chain
            setLastCompletedBlockId(blockId);
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
      // Get sequences from input connection or pasted sequences
      let currentRunParams = { ...block.parameters }; // Use this for parameter values in this run
      let sequencesArray; // This will hold the actual array of sequences to iterate
      
      // Check if we need to load data (first run or explicit load)
      // Use currentRunParams here for reading loadedSequences status
      const shouldLoadData = params?.loadData || (block.status === 'idle' && !currentRunParams.loadedSequences);
      
      if (shouldLoadData) {
        let determinedSequences = []; // This was the 'sequences' variable in the original code
        
        // Check for 'sequences_list' input from a connected block
        const blockConnectionData = connections[blockId];
        if (blockConnectionData && blockConnectionData.sequences_list) {
          const inputConnection = Array.isArray(blockConnectionData.sequences_list) 
            ? blockConnectionData.sequences_list[0] 
            : blockConnectionData.sequences_list;
          
          console.log("Sequence Iterator: Checking input connection:", inputConnection);
          
          if (inputConnection && blockOutputs[inputConnection.source]) {
            const sourceOutputData = blockOutputs[inputConnection.source];
            console.log("Sequence Iterator: Data from connected source:", sourceOutputData);

            if (sourceOutputData.sequences && Array.isArray(sourceOutputData.sequences)) {
              determinedSequences = sourceOutputData.sequences;
              console.log("Sequence Iterator: Using sequences array from input connection.", determinedSequences);
            } else if (sourceOutputData.filePath || sourceOutputData.fasta_file) {
              const filePathToRead = sourceOutputData.filePath || sourceOutputData.fasta_file;
              console.log("Sequence Iterator: Attempting to read sequences from file path:", filePathToRead);
              try {
                const response = await jobService.readFastaFile(filePathToRead);
                if (response.success && response.sequences) {
                  determinedSequences = response.sequences;
                } else {
                  const errorMsg = `Failed to read sequence file: ${response.error || 'Unknown error'}`;
                  console.error(`Sequence Iterator: ${errorMsg}`);
                  showErrorToast(errorMsg);
                  updateBlockInStore(blockId, { status: 'failed' });
                  return;
                }
              } catch (error) {
                const errorMsg = `Error reading sequence file: ${error.message || 'Unknown error'}`;
                console.error(`Sequence Iterator: ${errorMsg}`);
                showErrorToast(errorMsg);
                updateBlockInStore(blockId, { status: 'failed' });
                return;
              }
            } else {
              console.warn("Sequence Iterator: Connected input source does not contain 'sequences' array or a 'filePath'/'fasta_file'. Source Block ID:", inputConnection.source, "Output:", sourceOutputData);
            }
          } else {
            console.warn("Sequence Iterator: Input connection found for 'sequences_list', but no output data from source block:", inputConnection?.source);
          }
        }
        
        // If no sequences from input connection, use pasted sequences from parameters
        // Read from currentRunParams.sequences instead of block.parameters.sequences
        if (determinedSequences.length === 0 && currentRunParams.sequences && Array.isArray(currentRunParams.sequences) && currentRunParams.sequences.length > 0) {
          console.log("Sequence Iterator: Using pasted sequences from block parameters.", currentRunParams.sequences);
          determinedSequences = currentRunParams.sequences;
        }

        if (determinedSequences.length === 0) {
          showErrorToast('Sequence Iterator: No sequences found from input connection or parameters.');
          updateBlockInStore(blockId, { status: 'failed' });
          return;
        }

        // Prepare the parameters object for the store and for this run's logic
        currentRunParams = {
          ...block.parameters, // Base on the original store state to preserve other parameters
          loadedSequences: determinedSequences,
          currentIndex: 0,
          totalSequences: determinedSequences.length,
          completedSequences: 0 // Reset completed count when loading new data
        };
        updateBlockInStore(blockId, {
          parameters: currentRunParams
        });
        sequencesArray = determinedSequences;
        // The direct mutation of block.parameters is removed.
      } else {
        // Use already loaded sequences from currentRunParams
        sequencesArray = currentRunParams.loadedSequences || [];
      }

      // Use currentRunParams for parameter values, and sequencesArray for the list
      const currentIndex = currentRunParams.currentIndex || 0;
      const totalSequences = currentRunParams.totalSequences || (sequencesArray ? sequencesArray.length : 0);
      let completedSequencesCount = currentRunParams.completedSequences || 0;

      if (!sequencesArray || sequencesArray.length === 0 || currentIndex >= sequencesArray.length) {
        console.log('Sequence Iterator: All sequences processed or no sequences available.');
        updateBlockInStore(blockId, { 
          status: 'completed', 
          parameters: { ...currentRunParams } // Persist the final state of currentRunParams
        });        if (loopConfig.isEnabled && loopConfig.iterationType === 'sequence' && loopConfig.sequenceBlockId === blockId) {
            console.log("Sequence iterator is the loop's sequence provider and has finished. Stopping loop.");
            stopLoop(); 
        }
        return;
      }

      const currentSequence = sequencesArray[currentIndex];
      completedSequencesCount++;

      // Prepare parameters for the next state update, based on currentRunParams
      const parametersForNextStoreUpdate = {
        ...currentRunParams,
        currentIndex: currentIndex + 1,
        completedSequences: completedSequencesCount
      };
      updateBlockInStore(blockId, {
        status: 'completed', 
        parameters: parametersForNextStoreUpdate
      });

      const output = {
        sequence: currentSequence,
        info: `Sequence ${currentIndex + 1} of ${totalSequences}`,
        sequence_name: currentSequence.name || currentSequence.id || `sequence_${currentIndex + 1}`,
        progress: {
          current: currentIndex + 1,
          completed: completedSequencesCount,
          total: totalSequences,
          remaining: totalSequences - (currentIndex + 1)
        }
      };

      setBlockOutputs(prev => ({
        ...prev,
        [blockId]: output
      }));

      console.log('Sequence iterator output:', output);
      console.log('isAutomate:', isAutomate);      // Automation is now handled by the centralized useEffect automation logic
      // Set lastCompletedBlockId to trigger automation chain
      if (isAutomate) {
        setLastCompletedBlockId(blockId);
      }return;
    }

    // Input Data Check (for standard blocks, after blockInputs is populated)
    if (block.type !== 'file_upload' && block.type !== 'multi_download' && block.type !== 'sequence_iterator') {
      if (currentBlockType.inputs && currentBlockType.inputs.length > 0) {        const getInputKeyForHandle = (handleName) => {
          switch (handleName) {
            case 'sequence': return 'sequence';
            case 'structure': return 'pdb_file';
            case 'molecule': return 'molecule_file';
            case 'metrics': return 'metrics';
            case 'results': return 'results';
            case 'blast_results': return 'blast_results';
            case 'foldseek_results': return 'foldseek_results';
            case 'msa_results': return 'msa_results';
            case 'docking_results': return 'docking_results';
            case 'binding_sites': return 'binding_sites';
            case 'fasta': return 'fasta_file'; // Used by sequence_iterator if input is a file
            default: return handleName; // Assumes the data is directly under the handle name in blockInputs
          }
        };for (const inputHandleName of currentBlockType.inputs) {
          // Make binding_sites input optional for perform_docking block
          const isOptionalInput = (block.type === 'perform_docking' && inputHandleName === 'binding_sites');
          
          const requiredInputKey = getInputKeyForHandle(inputHandleName);
          const blockConnectionData = connections[blockId];
          const connectionForThisInput = blockConnectionData ? blockConnectionData[inputHandleName] : null;

          if (!connectionForThisInput && !isOptionalInput) {
            showErrorToast(`Block '${currentBlockType.name}' is missing a connection for required input: ${inputHandleName}`);
            updateBlockInStore(blockId, { status: 'failed' });
            return;
          }
          
          // Check if the actual data is present in blockInputs (only for required inputs)
          if (!isOptionalInput && (blockInputs[requiredInputKey] === undefined || blockInputs[requiredInputKey] === null)) {
            // It's possible the upstream block completed but its output structure was not as expected or was empty.
             showErrorToast(`Block '${currentBlockType.name}' is missing data for required input: ${inputHandleName} (from key: ${requiredInputKey})`);
            updateBlockInStore(blockId, { status: 'failed' });
            return;
          }
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
      showErrorToast(`Error running block ${block.type}: ${error.message || 'Unknown error'}`);
      updateBlockInStore(blockId, { status: 'failed' });
    }
  };

  const handleConfirmJob = async (jobId) => {
    const jobData = jobManager.current.jobList.get(jobId);
    if (!jobData) {
      console.error('Job data not found in jobManager for job ID:', jobId);
      showErrorToast(`Job data not found for ID: ${jobId}`);
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
        showErrorToast(`Failed to confirm job ${jobData.name}: ${response.message || 'Unknown error'}`);
        if (associatedBlockId) updateBlockInStore(associatedBlockId, { status: 'failed' });
        return false;
      }
    } catch (error) {
      console.error('Error confirming job:', error);
      showErrorToast(`Error confirming job ${jobData.name}: ${error.message || 'Unknown error'}`);
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
              showErrorToast('Loop stopped due to a block failure.');
            }
          }
        } else if (jobStatus.status === 'failed') { // This is the original 'failed' block from pollJobStatus
          clearInterval(pollingInterval);
          updateBlockInStore(blockIdForStatusUpdate, { status: 'failed' });
          if (loopConfig.isEnabled) {
            console.log('Loop stopped due to block failure (outer check).');
            stopLoop();
            showErrorToast('Loop stopped due to a block failure.');
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        showErrorToast(`Error polling job ${jobId}: ${error.message || 'Unknown error'}`);
        clearInterval(pollingInterval);
        updateBlockInStore(blockIdForStatusUpdate, { status: 'failed' });
        if (loopConfig.isEnabled) {
          console.log('Loop stopped due to error');
          stopLoop();
          showErrorToast('Loop stopped due to an error during polling.');
        }
      }
    };

    pollingInterval = setInterval(checkStatus, AWAIT_TIME);
    checkStatus();
  };  // --- NEW: useEffect to trigger automation chain only after status is updated ---
  useEffect(() => {
    console.log('Automation useEffect triggered:', { isAutomate, lastCompletedBlockId });
    
    if (!isAutomate || !lastCompletedBlockId) return;
    
    // Use the blocks from the store directly to avoid dependency issues
    const currentBlocks = useWorkspaceStore.getState().blocks;
    const currentConnections = useWorkspaceStore.getState().connections;
    
    console.log('Current blocks in automation:', currentBlocks.length);
    
    // Find the block in the latest Zustand state
    const completedBlock = currentBlocks.find(b => b.id === lastCompletedBlockId && b.status === 'completed');
    if (!completedBlock) {
      console.log('Completed block not found or not completed:', lastCompletedBlockId);
      return;
    }
    
    // Get next blocks in chain using current state
    const nextBlocks = currentBlocks.filter(block => {
      const blockConnection = currentConnections[block.id];
      if (!blockConnection) return false;
      
      // Check if any input handle has a connection from the current block
      return Object.entries(blockConnection).some(([handle, connections]) => {
        // Handle both array and single connection for backward compatibility
        const connectionArray = Array.isArray(connections) ? connections : [connections];
        return connectionArray.some(conn => conn && conn.source === lastCompletedBlockId);
      });
    });
    
    if (nextBlocks.length > 0) {
      console.log('Next blocks:', nextBlocks.map(b => b.id).join(', '));
      setTimeout(() => {
        nextBlocks.forEach(nextBlock => {
          if (nextBlock && nextBlock.id) {
            console.log(`Automated chain (useEffect): Triggering ${nextBlock.id} from ${lastCompletedBlockId}`);
            // Don't pass params - let the normal connection-based input processing handle the data mapping
            runBlock(nextBlock.id);
          }
        });
      }, AWAIT_TIME);
    } else {
      console.log('No next blocks found - automation chain completed');
    }
      // Reset lastCompletedBlockId so it doesn't retrigger (delayed to prevent race conditions)
    setTimeout(() => {
      setLastCompletedBlockId(null);
    }, 100);
  }, [lastCompletedBlockId, isAutomate, loopConfig.sequenceBlockId]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleClearAllBlocks = () => {
    // Confirmation dialog before clearing
    if (window.confirm("Are you sure you want to clear all blocks from the workspace? This action cannot be undone.")) {
      // Dispose all Mol* plugins
      blocks.forEach(block => {
        const viewerDomId = `viewer-${block.id}`;
        if (molstarPlugins.current[viewerDomId]) {
          console.log(`Disposing Mol* plugin for cleared block ${block.id}`);
          molstarPlugins.current[viewerDomId].dispose();
          delete molstarPlugins.current[viewerDomId];
        }
      });
      // Call store action to clear blocks and connections
      useWorkspaceStore.getState().clearWorkspace(); // Assuming a clearWorkspace action exists/will be added
      setBlockOutputs({}); // Clear any lingering outputs
      setLastCompletedBlockId(null); // Reset last completed block
      // Reset loop config if needed, or handle its state appropriately
      setLoopConfig({
        isEnabled: false,
        startBlockId: null,
        endBlockId: null,
        iterationType: 'count',
        iterationCount: 1,
        sequenceBlockId: null,
        currentIteration: 0
      });
       // Reset automation state
      setIsAutomate(false);
      console.log('All blocks cleared from workspace.');
    }
  };

   return (
    <div className="flex flex-col h-full" style={{ 
      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, var(--color-primary) 100%)'
    }}>
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-1 overflow-hidden">
          {/* Dynamic Sidebar Container */}
          <div className="flex-shrink-0 border-r shadow-2xl" style={{
            backgroundColor: 'var(--color-primary)',
            borderRightColor: 'var(--color-border)'
          }}>
            <BlockPalette blockTypes={blockTypes} />
          </div>

          {/* Main Workspace */}
          <div className="flex-1 relative overflow-hidden" style={{
            background: 'var(--color-secondary)'
          }}>
            {/* Floating Action Buttons */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
              {/* Settings Toggle */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-12 h-12 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center group"
                style={{
                  backgroundColor: 'var(--color-accent)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-accentHover)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Clear Outputs */}
              <button
                onClick={clearOutputs}
                className="w-12 h-12 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center group"
                style={{
                  backgroundColor: 'var(--color-warning)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#d97706'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-warning)'}
                title="Clear all outputs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Clear All Blocks */}
              <button
                onClick={handleClearAllBlocks}
                className="w-12 h-12 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center group"
                style={{
                  backgroundColor: 'var(--color-error)'
                }}
                onMouseEnter={(e) => {
                  const errorColor = getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim();
                  // Create a slightly darker version of the error color for hover
                  e.target.style.backgroundColor = errorColor === '#ef4444' ? '#dc2626' : '#c53030';
                }}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-error)'}
                title="Clear all blocks"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Automation Toggle */}
              <button
                onClick={() => setIsAutomate(!isAutomate)}
                className={`w-12 h-12 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center`}
                style={{
                  backgroundColor: isAutomate ? 'var(--color-success)' : 'var(--color-info)'
                }}
                onMouseEnter={(e) => {
                  if (isAutomate) {
                    e.target.style.backgroundColor = '#059669'; // darker green
                  } else {
                    e.target.style.backgroundColor = '#2563eb'; // darker blue
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = isAutomate ? 'var(--color-success)' : 'var(--color-info)';
                }}
                title={`Automation: ${isAutomate ? 'ON' : 'OFF'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>

            {/* Settings Panel */}
            {isSettingsOpen && (
              <div className="absolute top-4 left-4 right-20 z-40 border rounded-lg p-4 shadow-xl backdrop-blur-sm" style={{
                backgroundColor: 'var(--color-secondary)',
                borderColor: 'var(--color-border)'
              }}>
                <div className="flex flex-wrap gap-4">
                  {/* Loop Controls */}
                  <div className="flex-1 min-w-[300px]">
                    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border" style={{
                      backgroundColor: 'var(--color-secondary)',
                      borderColor: 'var(--color-border)'
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-textPrimary)' }}>Loop</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={loopConfig.isEnabled}
                            onChange={() => setLoopConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                          />
                          <div 
                            className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                            style={{
                              backgroundColor: loopConfig.isEnabled ? 'var(--color-accent)' : 'var(--color-textMuted)',
                              borderColor: 'var(--color-border)'
                            }}
                          ></div>
                        </label>
                      </div>
                      {loopConfig.isEnabled && (
                        <div className="flex flex-wrap gap-3">
                          <select
                            className="text-sm rounded-lg px-3 py-1.5 border focus:outline-none transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-tertiary)',
                              color: 'var(--color-textPrimary)',
                              borderColor: 'var(--color-border)'
                            }}
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
                            className="text-sm rounded-lg px-3 py-1.5 border focus:outline-none transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-tertiary)',
                              color: 'var(--color-textPrimary)',
                              borderColor: 'var(--color-border)'
                            }}
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
                            className="text-sm rounded-lg px-3 py-1.5 border focus:outline-none transition-colors duration-200"
                            style={{
                              backgroundColor: 'var(--color-tertiary)',
                              color: 'var(--color-textPrimary)',
                              borderColor: 'var(--color-border)'
                            }}
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
                              className="text-sm rounded-lg px-3 py-1.5 border focus:outline-none transition-colors duration-200 w-20"
                              style={{
                                backgroundColor: 'var(--color-tertiary)',
                                color: 'var(--color-textPrimary)',
                                borderColor: 'var(--color-border)'
                              }}
                            />
                          ) : (
                            <select
                              className="text-sm rounded-lg px-3 py-1.5 border focus:outline-none transition-colors duration-200"
                              style={{
                                backgroundColor: 'var(--color-tertiary)',
                                color: 'var(--color-textPrimary)',
                                borderColor: 'var(--color-border)'
                              }}
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
                            className="px-4 py-1.5 text-white rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                            style={{
                              backgroundColor: 'var(--color-accent)'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-accentHover)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Start Loop
                          </button>
                          <button
                            onClick={stopLoop}
                            className="px-4 py-1.5 border rounded-lg text-sm transition-colors duration-200 flex items-center gap-2"
                            style={{
                              backgroundColor: 'var(--color-tertiary)',
                              color: 'var(--color-textPrimary)',
                              borderColor: 'var(--color-border)'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                            </svg>
                            Stop Loop
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              onClearBlockOutput={clearBlockOutput}
              isAutomate={isAutomate}
            />
          </div>
        </div>
      </DndProvider>
      <ToastContainer />
    </div>
  );
};

export default SandboxPage;