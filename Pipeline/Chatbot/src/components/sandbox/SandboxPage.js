import React, { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockPalette from './BlockPalette';
import WorkspaceSurface from './WorkspaceSurface';
import JobManager from '../JobManager';
import { downloadService, jobService } from '../../services/api';
import { blockTypes } from './config/blockTypes';

const SandboxPage = () => {
  const [blocks, setBlocks] = useState([]);
  const blocksRef = useRef(blocks);
  const [connections, setConnections] = useState({});
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
  const jobManager = useRef(new JobManager());

  // Update refs whenever their corresponding states change
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    blockOutputsRef.current = blockOutputs;
  }, [blockOutputs]);

  // Add a new block to the workspace
  const addBlock = (blockType, position) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType.id,
      position,
      parameters: {},
      status: 'idle'
    };

    setBlocks(prevBlocks => [...prevBlocks, newBlock]);
    return newBlock.id;
  };

  // Connect two blocks together
  const connectBlocks = (sourceBlockId, targetBlockId, outputType, inputType) => {
    setConnections(prev => {
      const targetBlock = blocks.find(b => b.id === targetBlockId);
      const targetBlockType = blockTypes.find(bt => bt.id === targetBlock?.type);
      
      // Special handling for multi_download block
      if (targetBlockType?.id === 'multi_download') {
        // Create unique key for each connection to the same input
        const uniqueInputKey = `${inputType}_${Date.now()}`;
        
        return {
          ...prev,
          [targetBlockId]: {
            ...prev[targetBlockId],
            [uniqueInputKey]: {
              blockId: sourceBlockId,
              outputType
            }
          }
        };
      }
      
      // For other blocks, replace the connection for that input type
      return {
        ...prev,
        [targetBlockId]: {
          ...prev[targetBlockId],
          [inputType]: {
            blockId: sourceBlockId,
            outputType
          }
        }
      };
    });
  };

  // Handle job confirmation
  const handleConfirmJob = async (jobId) => {
    try {
      // Send the job directly to the backend
      const response = await jobService.confirmJob(
        jobId,
        jobManager.current.jobList.get(jobId)
      );

      if (response.success) {
        // Remove job from pending confirmations
        jobManager.current.removeFromPendingConfirmations(jobId);

        // Start polling for job status
        // Get the block_id from either the response or from our original job
        const jobData = response.job;
        const blockId = jobData.block_id ||
          (jobManager.current.jobList.get(jobId)?.block_id);

        if (blockId) {
          pollJobStatus(jobId, blockId);
        } else {
          console.warn('No block_id found for job', jobId);
        }

        return true;
      } else {
        console.error('Failed to confirm job:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Error confirming job:', error);
      return false;
    }
  };

  const getNextBlocksInChain = (currentBlockId) => {
    // Find all blocks that have this block as an input
    const nextBlocks = blocks.filter(block => {
      const blockConnection = connections[block.id];
      return blockConnection && Object.values(blockConnection).some(
        conn => conn.blockId === currentBlockId
      );
    });

    if (nextBlocks.length > 0) {
      console.log('Next blocks:', nextBlocks.map(b => b.id).join(', '));
      return nextBlocks;
    }
    console.log('No next blocks found - end of sequence');
    return [];
  };

  const runBlock = async (blockId, params = null) => {
    const block = blocksRef.current.find(b => b.id === blockId);
    if (!block) return;
    setBlockOutputs(prev => ({
      ...prev,
      [blockId]: null
    }));    
    console.log('Running block:', block.type);

    // Update block status
    setBlocks(prevBlocks =>
      prevBlocks.map(b =>
        b.id === blockId ? { ...b, status: 'running' } : b
      )
    );

    if (params) {
      setBlockOutputs(prev => ({
        ...prev,
        [blockId]: params
      }));
    }

    if (block.type === 'multi_download') {
      // gather all connected inputs
      const conns = connections[blockId] || {};
      
      // wait until every source block is status 'completed'
      const pending = Object.values(conns).filter(c =>
        blocksRef.current.find(b => b.id === c.blockId)?.status !== 'completed'
      );
      if (pending.length) {
        console.log('Waiting on inputs for multi_download:', pending);
        return;
      }

      // collect every source block's output as a downloadable descriptor
      const downloadItems = Object.entries(conns).map(([inputType, c]) => {
        const sourceBlock = blocksRef.current.find(b => b.id === c.blockId);
        const sourceBlockType = blockTypes.find(bt => bt.id === sourceBlock?.type);
        const output = blockOutputsRef.current[c.blockId];
        
        console.log('Processing output for multi-download:', {
          blockId: c.blockId,
          outputType: c.outputType,
          blockType: sourceBlockType?.id,
          output
        });

        if (!output) {
          console.warn(`No output found for block ${c.blockId} with type ${c.outputType}`);
        }
        
        return {
          outputType: c.outputType,
          data: output
        };
      });

      // Verify we have all required data
      const missingData = downloadItems.filter(item => !item.data);
      if (missingData.length > 0) {
        console.error('Missing data for multi-download:', missingData);
        setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'failed' } : b));
        return;
      }

      // mark running
      setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'running' } : b));

      try {
        // POST to backend to assemble ZIP
        const resp = await downloadService.multiDownload({ items: downloadItems });
        if (resp.success && resp.zipUrl) {
          // trigger browser download
          const a = document.createElement('a');
          a.href = resp.zipUrl;
          a.download = `batch_download_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'completed' } : b));
          
          // Handle loop continuation if this is the end block
          if (loopConfig.isEnabled && blockId === loopConfig.endBlockId) {
            setLoopConfig(prev => {
              const nextIteration = prev.currentIteration + 1;
              const shouldContinue = prev.iterationType === 'count'
                ? nextIteration < prev.iterationCount
                : blocksRef.current
                    .find(b => b.id === prev.sequenceBlockId)
                    ?.parameters?.sequences?.length > 0;

              if (!shouldContinue) {
                console.log('Loop completed - no more iterations');
                stopLoop();
                return prev;
              }

              // Reset block statuses and outputs
              resetBlocksBetween(prev.startBlockId, prev.endBlockId);
              resetOutputsBetween(prev.startBlockId, prev.endBlockId);

              console.log(`Starting loop iteration ${nextIteration} of ${prev.iterationCount}`);

              // Schedule exactly one re-run
              if (!loopQueuedRef.current) {
                loopQueuedRef.current = true;
                setTimeout(() => {
                  loopQueuedRef.current = false;
                  runBlock(prev.startBlockId);
                }, 1000);
              }

              return { ...prev, currentIteration: nextIteration };
            });
          }
        } else {
          setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'failed' } : b));
          console.error('Multi-download failed', resp.error);
        }
      } catch (error) {
        setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'failed' } : b));
        console.error('Multi-download execution error:', error);
      }
      return;
    }
    
    if (block.type === 'sequence_iterator') {
      clearOutputs();
      const sequences = block.parameters.sequences || [];
      const currentIndex = block.parameters.currentIndex || 0;

      if (sequences.length === 0) {
        // No sequences to iterate through
        setBlocks(prevBlocks =>
          prevBlocks.map(b =>
            b.id === blockId ? { ...b, status: 'failed' } : b
          )
        );
        return;
      }

      // Get the current sequence
      const currentSequence = sequences[currentIndex];

      // Create a new array without the current sequence
      const remainingSequences = [...sequences];
      remainingSequences.splice(currentIndex, 1);

      // Update block status and output
      setBlocks(prevBlocks =>
        prevBlocks.map(b =>
          b.id === blockId ? {
            ...b,
            status: 'completed',
            parameters: {
              ...b.parameters,
              sequences: remainingSequences,
              currentIndex: 0, // Reset to 0 since we're removing the current sequence
              totalSequences: sequences.length,
              completedSequences: (b.parameters.completedSequences || 0) + 1
            }
          } : b
        )
      );

      // Store block output
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

      // Support for automation mode
      if (isAutomate) {
        console.log('Automation enabled, running next blocks in sequence iterator chain');
        // Find and run connected blocks
        const nextBlocks = getNextBlocksInChain(blockId);
        if (nextBlocks.length > 0) {
          // Use a timeout to ensure state is updated
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

    // Get input data from connected blocks if params not provided
    const blockInputs = params || {};
    if (!params) {
      const blockConnection = connections[blockId];
      if (blockConnection) {
        for (const [inputType, connection] of Object.entries(blockConnection)) {
          if (blockOutputs[connection.blockId]) {
            // Get the specific output type from the source block
            const sourceOutput = blockOutputs[connection.blockId];
            console.log(`Getting ${connection.outputType} from block ${connection.blockId}:`, sourceOutput);

            // Extract the specific data needed based on the output type
            switch (connection.outputType) {
              case 'sequence':
                blockInputs.sequence = sourceOutput.sequence;
                break;
              case 'structure':
                blockInputs.pdb_file = sourceOutput.pdb_file;
                break;
              case 'metrics':
                blockInputs.metrics = sourceOutput.metrics;
                break;
              case 'results':
                blockInputs.results = sourceOutput.results;
                break;
              default:
                // Just pass the whole output if we don't know what to extract
                blockInputs[inputType] = sourceOutput;
            }
          }
        }
      }
    }

    // Log what we're passing to the job
    console.log(`Running block ${blockId} with inputs:`, blockInputs);

    try {
      // Create job with parameters
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
        block_id: blockId // Added to track which block this job belongs to
      };

      // Add job to manager for confirmation
      jobManager.current.addJobConfirmation(job);

      // Auto-confirm job rather than waiting for user confirmation
      const success = await handleConfirmJob(job.id);

      if (!success) {
        // Update block status to failed
        setBlocks(prevBlocks =>
          prevBlocks.map(b =>
            b.id === blockId ? { ...b, status: 'failed' } : b
          )
        );
      }
    } catch (error) {
      console.error('Error running block:', error);
      // Update block status to failed
      setBlocks(prevBlocks =>
        prevBlocks.map(b =>
          b.id === blockId ? { ...b, status: 'failed' } : b
        )
      );
    }
  };

  // Poll for job status
  const pollJobStatus = async (jobId, blockId) => {
    let pollingInterval;

    const checkStatus = async () => {
      try {
        const jobStatus = await jobService.getJobStatus(jobId);

        if (jobStatus.status === 'completed') {
          clearInterval(pollingInterval);

          // Update block status and store the result
          setBlocks(prevBlocks =>
            prevBlocks.map(b =>
              b.id === blockId ? { ...b, status: 'completed' } : b
            )
          );

          // Store block output
          setBlockOutputs(prev => ({
            ...prev,
            [blockId]: jobStatus.result
          }));

          // Handle normal automation first
          if (isAutomate) {
            console.log('Running next blocks in chain');
            const nextBlocks = getNextBlocksInChain(blockId);
            if (nextBlocks.length > 0) {
              setTimeout(() => {
                nextBlocks.forEach(nextBlock => {
                  if (nextBlock && nextBlock.id) {
                    setBlockOutputs(prev => ({
                      ...prev,
                      [nextBlock.id]: jobStatus.result
                    }));
                    runBlock(nextBlock.id, jobStatus.result);
                  }
                });
              }, 5000);
            } else {
              console.log('Pipeline sequence completed');
              
              // After sequence completes, handle loop logic if enabled
              if (loopConfig.isEnabled && blockId === loopConfig.endBlockId) {
                console.log('Loop logic enabled and end block reached');
                // Check if we should continue based on iteration type
                const shouldContinue = loopConfig.iterationType === 'count' 
                  ? loopConfig.currentIteration < loopConfig.iterationCount
                  : blocksRef.current.find(b => b.id === loopConfig.sequenceBlockId)?.parameters?.sequences?.length > 0;

                if (shouldContinue) {
                  console.log('Should continue with next iteration');
                  // Wait for a short delay to ensure state updates
                  setTimeout(() => {
                    // Reset all blocks between start and end to idle state
                    const startIndex = blocksRef.current.findIndex(b => b.id === loopConfig.startBlockId);
                    const endIndex = blocksRef.current.findIndex(b => b.id === loopConfig.endBlockId);
                    
                    if (startIndex !== -1 && endIndex !== -1) {
                      setBlocks(prevBlocks => 
                        prevBlocks.map((block, index) => {
                          if (index >= startIndex && index <= endIndex) {
                            return { ...block, status: 'idle' };
                          }
                          return block;
                        })
                      );
                    }

                    // Clear outputs for blocks in the loop
                    setBlockOutputs(prev => {
                      const newOutputs = { ...prev };
                      const startIndex = blocksRef.current.findIndex(b => b.id === loopConfig.startBlockId);
                      const endIndex = blocksRef.current.findIndex(b => b.id === loopConfig.endBlockId);
                      
                      if (startIndex !== -1 && endIndex !== -1) {
                        blocksRef.current.forEach((block, index) => {
                          if (index >= startIndex && index <= endIndex) {
                            delete newOutputs[block.id];
                          }
                        });
                      }
                      return newOutputs;
                    });

                    // Increment iteration counter and start next iteration
                    setLoopConfig(prev => {
                      const newConfig = {
                        ...prev,
                        currentIteration: prev.currentIteration + 1
                      };
                      console.log(`Starting loop iteration ${newConfig.currentIteration} of ${newConfig.iterationCount}`);
                      runBlock(loopConfig.startBlockId);
                      return newConfig;
                    });
                  }, 1000);
                } else {
                  console.log('Loop completed - no more iterations');
                  stopLoop();
                }
              }
            }
          }
        } else if (jobStatus.status === 'failed') {
          clearInterval(pollingInterval);
          setBlocks(prevBlocks =>
            prevBlocks.map(b =>
              b.id === blockId ? { ...b, status: 'failed' } : b
            )
          );
          if (loopConfig.isEnabled) {
            console.log('Loop stopped due to block failure');
            stopLoop();
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollingInterval);
        setBlocks(prevBlocks =>
          prevBlocks.map(b =>
            b.id === blockId ? { ...b, status: 'failed' } : b
          )
        );
        if (loopConfig.isEnabled) {
          console.log('Loop stopped due to error');
          stopLoop();
        }
      }
    };

    pollingInterval = setInterval(checkStatus, 5000);
    checkStatus();
  };

  // Update block parameters
  const updateBlockParameters = (blockId, parameters) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(b =>
        b.id === blockId ? { ...b, parameters: { ...b.parameters, ...parameters } } : b
      )
    );
  };

  // Update block properties
  const updateBlock = (blockId, updates) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    );
  };

  // Delete a block and its connections
  const deleteBlock = (blockId) => {
    setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== blockId));
    setConnections(prev => {
      const newConnections = { ...prev };
      // Remove connections where this block is the target
      delete newConnections[blockId];
      // Remove connections where this block is the source
      Object.keys(newConnections).forEach(targetId => {
        Object.keys(newConnections[targetId]).forEach(inputType => {
          if (newConnections[targetId][inputType].blockId === blockId) {
            delete newConnections[targetId][inputType];
          }
        });
        // Clean up empty connection objects
        if (Object.keys(newConnections[targetId]).length === 0) {
          delete newConnections[targetId];
        }
      });
      return newConnections;
    });
  };

  // Add this function after the deleteBlock function
  const clearOutputs = () => {
    // Reset all block statuses to 'idle'
    setBlocks(prevBlocks =>
      prevBlocks.map(block => ({
        ...block,
        status: 'idle'
      }))
    );
    
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
    setLoopConfig(prev => ({
      ...prev,
      isEnabled: false,
      currentIteration: 0
    }));
  };

  // Add loop configuration UI
  const renderLoopControls = () => (
    <div className="flex items-center gap-4 bg-[#233c48] px-4 py-2 rounded-lg border border-[#344854]">
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
        <div className="flex items-center gap-3">
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
  );

  // Add helper functions for resetting blocks and outputs
  const resetBlocksBetween = (startBlockId, endBlockId) => {
    const startIndex = blocksRef.current.findIndex(b => b.id === startBlockId);
    const endIndex = blocksRef.current.findIndex(b => b.id === endBlockId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      setBlocks(prevBlocks => 
        prevBlocks.map((block, index) => {
          if (index >= startIndex && index <= endIndex) {
            return { ...block, status: 'idle' };
          }
          return block;
        })
      );
    }
  };

  const resetOutputsBetween = (startBlockId, endBlockId) => {
    const startIndex = blocksRef.current.findIndex(b => b.id === startBlockId);
    const endIndex = blocksRef.current.findIndex(b => b.id === endBlockId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      setBlockOutputs(prev => {
        const newOutputs = { ...prev };
        blocksRef.current.forEach((block, index) => {
          if (index >= startIndex && index <= endIndex) {
            delete newOutputs[block.id];
          }
        });
        return newOutputs;
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#111c22]">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-8 py-4 shrink-0 bg-[#111c22]/95 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#13a4ec]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Protein Pipeline Sandbox
          </h2>
        </div>
        <div className="flex items-center gap-6">
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
          {renderLoopControls()}
          <div className="flex items-center gap-3 bg-[#233c48] px-4 py-2 rounded-lg border border-[#344854]">
            <span className="text-white text-sm font-medium">Automate</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAutomate} onChange={() => setIsAutomate(!isAutomate)} />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#13a4ec]"></div>
            </label>
          </div>
        </div>
      </header>

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
              connectBlocks={connectBlocks}
              runBlock={runBlock}
              updateBlockParameters={updateBlockParameters}
              blockOutputs={blockOutputs}
              updateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
              loopConfig={loopConfig}
              setLoopConfig={setLoopConfig}
            />
          </div>
        </div>
      </DndProvider>
    </div>
  );
};

export default SandboxPage; 