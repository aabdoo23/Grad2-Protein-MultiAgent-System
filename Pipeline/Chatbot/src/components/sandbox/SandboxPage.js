import React, { useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockPalette from './BlockPalette';
import WorkspaceSurface from './WorkspaceSurface';
import JobManager from '../JobManager';
import { downloadService, jobService } from '../../services/api';
import { blockTypes } from './config/blockTypes';

const SandboxPage = () => {
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState({});
  const [blockOutputs, setBlockOutputs] = useState({});
  const [isAutomate, setIsAutomate] = useState(false);
  const jobManager = useRef(new JobManager());

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
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
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
        blocks.find(b => b.id === c.blockId)?.status !== 'completed'
      );
      if (pending.length) {
        console.log('Waiting on inputs for multi_download:', pending);
        return;
      }

      // collect every source block's output as a downloadable descriptor
      const downloadItems = Object.entries(conns).map(([inputType, c]) => {
        const sourceBlock = blocks.find(b => b.id === c.blockId);
        const sourceBlockType = blockTypes.find(bt => bt.id === sourceBlock?.type);
        const output = blockOutputs[c.blockId];
        
        console.log('Processing output for multi-download:', {
          blockId: c.blockId,
          outputType: c.outputType,
          blockType: sourceBlockType?.id,
          output
        });
        
        return {
          outputType: c.outputType,
          data: output
        };
      });

      // mark running
      setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'running' } : b));

      try {
        // POST to backend to assemble ZIP
        const resp = await downloadService.multiDownload({ items: downloadItems });
        if (resp.success && resp.zipUrl) {
          // trigger browser download
          const a = document.createElement('a');
          a.href = resp.zipUrl;
          a.download = 'batch_download.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'completed' } : b));
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
          console.log('Block outputs:', blockOutputs[blockId]);
          console.log('isAutomate:', isAutomate);
          if (isAutomate) {
            console.log('Running next blocks in chain');
            // Find and run all next blocks in the chain
            const nextBlocks = getNextBlocksInChain(blockId);
            if (nextBlocks.length > 0) {
              // Use a longer timeout to ensure state updates are completed
              setTimeout(() => {
                // Run all connected blocks with the job results
                nextBlocks.forEach(nextBlock => {
                  if (nextBlock && nextBlock.id) {
                    // Store the output in blockOutputs before running the next block
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
            }
          }

        } else if (jobStatus.status === 'failed') {
          clearInterval(pollingInterval);

          // Update block status to failed
          setBlocks(prevBlocks =>
            prevBlocks.map(b =>
              b.id === blockId ? { ...b, status: 'failed' } : b
            )
          );
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollingInterval);

        // Update block status to failed
        setBlocks(prevBlocks =>
          prevBlocks.map(b =>
            b.id === blockId ? { ...b, status: 'failed' } : b
          )
        );
      }
    };

    // Start polling
    pollingInterval = setInterval(checkStatus, 5000);
    // Run once immediately
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

  return (
    <div className="flex flex-col h-screen bg-[#111c22]">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3 shrink-0">
        <div className="flex items-center gap-4 text-white">
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Protein Pipeline Sandbox</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearOutputs}
            className="px-3 py-1 bg-[#233c48] text-white border border-[#13a4ec] rounded text-sm hover:bg-[#2a4a5a]"
            title="Clear all outputs and reset blocks"
          >
            Clear Outputs
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">Automate</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAutomate} onChange={() => setIsAutomate(!isAutomate)} />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </header>

      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-[#1a2b34] border-r border-[#233c48] overflow-y-auto p-4">
            <h3 className="text-white text-md font-bold mb-4">Job Blocks</h3>
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
            />
          </div>
        </div>
      </DndProvider>
    </div>
  );
};

export default SandboxPage; 