import React, { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import BlockPalette from './BlockPalette';
import WorkspaceSurface from './WorkspaceSurface';
import JobManager from '../JobManager';
import axios from 'axios';

const SandboxPage = () => {
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState({});
  const [blockOutputs, setBlockOutputs] = useState({});
  const [pendingJobs, setPendingJobs] = useState([]);
  const jobManager = useRef(new JobManager());
  
  const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 900000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Set up job update callback to track pending confirmations
  useEffect(() => {
    jobManager.current.setJobUpdateCallback(() => {
      setPendingJobs(jobManager.current.getPendingConfirmations());
    });
  }, []);

  // Available job types
  const blockTypes = [
    {
      id: 'trigger',
      name: 'Trigger',
      description: 'Trigger the pipeline',
      color: '#bbb000',
      inputs: ['*'],
      outputs: ['*']
    },
    {
      id: 'generate_protein',
      name: 'Generate Protein',
      description: 'Generate a protein sequence with specific properties',
      color: '#E74C3C',
      inputs: ['*'],
      outputs: ['sequence']
    },
    {
      id: 'predict_structure',
      name: 'Predict Structure',
      description: 'Predict the 3D structure of a protein sequence',
      color: '#3498DB',
      inputs: ['sequence'],
      outputs: ['structure']
    },
    {
      id: 'search_similarity',
      name: 'Search Similarity',
      description: 'Search for similar protein sequences',
      color: '#F39C12',
      inputs: ['sequence'],
      outputs: ['results']
    },
    {
      id: 'search_structure',
      name: 'Search Structure',
      description: 'Search for similar protein structures using FoldSeek',
      color: '#9B59B6',
      inputs: ['structure'],
      outputs: ['results']
    },
    {
      id: 'end',
      name: 'End',
      description: 'End the pipeline',
      color: '#000000',
      inputs: ['*'],
      outputs: ['*']
    }
  ];

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
    setConnections(prev => ({
      ...prev,
      [targetBlockId]: {
        ...prev[targetBlockId],
        [inputType]: {
          blockId: sourceBlockId,
          outputType
        }
      }
    }));
  };

  // Handle job confirmation
  const handleConfirmJob = async (jobId) => {
    try {
      // Send the job directly to the backend
      const response = await api.post('/confirm-job', {
        job_id: jobId,
        job_data: jobManager.current.jobList.get(jobId)
      });
      
      if (response.data.success) {
        // Remove job from pending confirmations
        jobManager.current.removeFromPendingConfirmations(jobId);
        
        // Start polling for job status
        // Get the block_id from either the response or from our original job
        const jobData = response.data.job;
        const blockId = jobData.block_id || 
                       (jobManager.current.jobList.get(jobId)?.block_id);
                       
        if (blockId) {
          pollJobStatus(jobId, blockId);
        } else {
          console.warn('No block_id found for job', jobId);
        }
        
        return true;
      } else {
        console.error('Failed to confirm job:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error confirming job:', error);
      return false;
    }
  };

  const runTrigger = async (blockId) => {
    //run the trigger
    const trigger = blocks.find(b => b.id === blockId);
    if (!trigger) return;
    setBlocks(prevBlocks => 
      prevBlocks.map(b => 
        b.id === trigger.id ? { ...b, status: 'completed' } : b
      )
    );
    //get all the blocks that are connected to the trigger, and run them
    const triggerConnections = connections[trigger.id];
    if (!triggerConnections) return;
    //run all the blocks that are connected to the trigger
    for (const [inputType, connection] of Object.entries(triggerConnections)) {
      runBlock(connection.blockId);
    }
  };

  // Run a specific block
  const runBlock = async (blockId) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    if (block.type === 'trigger') {
      runTrigger(blockId);
      return;
    }

    // Update block status
    setBlocks(prevBlocks => 
      prevBlocks.map(b => 
        b.id === blockId ? { ...b, status: 'running' } : b
      )
    );

    // Get input data from connected blocks
    const blockInputs = {};
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
        const response = await api.get(`/job-status/${jobId}`);
        // Axios doesn't use response.ok, it throws errors for non-2xx responses
        const jobStatus = response.data;
        
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
    pollingInterval = setInterval(checkStatus, 3000);
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

  return (
    <div className="flex flex-col h-screen bg-[#111c22]">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3 shrink-0">
        <div className="flex items-center gap-4 text-white">
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Protein Pipeline Sandbox</h2>
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