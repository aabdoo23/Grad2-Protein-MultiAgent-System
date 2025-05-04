import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as NGL from 'ngl';
import BlastResults from './BlastResults';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 900000, // 15 minutes timeout to accommodate AlphaFold2 predictions
  headers: {
    'Content-Type': 'application/json'
  }
});

const FoldSeekResults = ({ results, originalPdbPath }) => {
  const [expandedDbs, setExpandedDbs] = useState({});
  const [visualizedHits, setVisualizedHits] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [isEvaluating, setIsEvaluating] = useState({});
  const viewerRefs = useRef({});

  if (!results || !results.databases) return null;

  const toggleDatabase = (dbName) => {
    setExpandedDbs(prev => ({
      ...prev,
      [dbName]: !prev[dbName]
    }));
  };

  const initViewer = (hitId, pdbPath) => {
    if (!viewerRefs.current[hitId]) {
      const stage = new NGL.Stage(`viewer-${hitId}`, { backgroundColor: '#1a2b34' });
      viewerRefs.current[hitId] = stage;

      // Load and display the PDB structure
      const filename = pdbPath.split('\\').pop();
      stage.loadFile(`http://localhost:5000/pdb/${filename}`).then(component => {
        component.addRepresentation('cartoon', {
          color: '#13a4ec',
          roughness: 1.0,
          metalness: 0.0
        });
        component.autoView();
      });
    }
  };

  // const handleEvaluate = async (hit, dbName) => {
  //   const hitKey = `${dbName}-${hit.target_id}`;
  //   if (!visualizedHits[hitKey] || !originalPdbPath) return;

  //   setIsEvaluating(prev => ({ ...prev, [hitKey]: true }));

  //   try {
  //     console.log('Evaluating structure...');
  //     const response = await api.post('/evaluate-structures', {
  //       pdb1_path: originalPdbPath,
  //       pdb2_path: visualizedHits[hitKey]
  //     });

  //     if (response.data.success) {
  //       setEvaluationResults(prev => ({
  //         ...prev,
  //         [hitKey]: response.data
  //       }));
  //     }
  //   } catch (error) {
  //     console.error('Error evaluating structures:', error);
  //   } finally {
  //     setIsEvaluating(prev => ({ ...prev, [hitKey]: false }));
  //   }
  // };

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

        // Get the filename from the original PDB path
        const originalPdbFilename = originalPdbPath.split('\\').pop();
        console.log('Original PDB filename:', originalPdbFilename);
        console.log('Downloaded PDB path:', pdbPath);

        // Trigger evaluation with the downloaded PDB path
        const evalResponse = await api.post('/evaluate-structures', {
          pdb1_path: originalPdbFilename,
          pdb2_path: pdbPath
        });

        if (evalResponse.data.success) {
          setEvaluationResults(prev => ({
            ...prev,
            [hitKey]: evalResponse.data
          }));
        } else {
          console.error('Evaluation failed:', evalResponse.data.error);
        }
      } else {
        console.error('Failed to download PDB:', response.data.error);
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
          <button
            onClick={() => toggleDatabase(dbName)}
            className="w-full text-left flex items-center justify-between cursor-pointer hover:bg-[#1d333d] p-2 rounded transition-colors"
          >
            <h6 className="text-white font-medium flex items-center space-x-2">
              <span>{dbName}</span>
              <span className="text-xs px-2 py-0.5 bg-[#344752] rounded-full text-gray-300">
                {dbData.hits.length} hits
              </span>
            </h6>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedDbs[dbName] ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedDbs[dbName] && (
            <div className="space-y-4 mt-4">
              {dbData.hits.map((hit, index) => {
                const hitKey = `${dbName}-${hit.target_id}`;
                return (
                  <div key={index} className="border border-[#344752] rounded-lg p-3">
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
                      <div
                        id={`viewer-${hitKey}`}
                        className="w-full h-[300px] rounded-lg mt-3 bg-[#1a2b34]"
                        ref={(el) => {
                          // Only initialize the stage when the element is mounted:
                          if (el) {
                            // In case a stage already exists for this hitKey, dispose it
                            if (viewerRefs.current[hitKey]) {
                              // Optional: if NGL supports disposing of a stage, you can do:
                              viewerRefs.current[hitKey].dispose();
                              delete viewerRefs.current[hitKey];
                            }
                            initViewer(hitKey, visualizedHits[hitKey]);
                          }
                        }}
                      />

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
          )}
        </div>
      ))}
    </div>
  );
};

const JobStatus = forwardRef((props, ref) => {
  const [jobs, setJobs] = useState([]);
  const pollingIntervals = useRef({});
  const jobTimers = useRef({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const viewerRefs = useRef({});

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 900000, // 15 minutes timeout to accommodate AlphaFold2 predictions
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (jobId) => {
    jobTimers.current[jobId] = 0;

    const timerInterval = setInterval(() => {
      jobTimers.current[jobId] = (jobTimers.current[jobId] || 0) + 1;
    }, 1000);

    return timerInterval;
  };

  const checkBlastResults = async (jobId, rid) => {
    const pollInterval = 15000; // 15 seconds
    let isPolling = true;

    const pollResults = async () => {
        while (isPolling) {
            try {
                const response = await api.get(`/check-blast-results/${rid}`);
                const status = response.data;

                setJobs(prevJobs => {
                    const updatedJobs = prevJobs.map(job => {
                        if (job.id === jobId) {
                            if (status.status === 'completed') {
                                isPolling = false;
                                return {
                                    ...job,
                                    status: 'completed',
                                    result: status
                                };
                            } else if (status.status === 'failed') {
                                isPolling = false;
                                return {
                                    ...job,
                                    status: 'failed',
                                    error: status.error
                                };
                            } else {
                                return {
                                    ...job,
                                    status: 'running',
                                    progress: 50 // Show some progress while waiting
                                };
                            }
                        }
                        return job;
                    });

                    if (status.status === 'completed' || status.status === 'failed') {
                        clearInterval(pollingIntervals.current[jobId]);
                        const newPollingIntervals = { ...pollingIntervals.current };
                        delete newPollingIntervals[jobId];
                        pollingIntervals.current = newPollingIntervals;

                        clearInterval(jobTimers.current[jobId]);
                        const newJobTimers = { ...jobTimers.current };
                        delete newJobTimers[jobId];
                        jobTimers.current = newJobTimers;
                    }

                    return updatedJobs;
                });

                if (status.status === 'completed' || status.status === 'failed') {
                    break;
                }

                // Wait for the next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            } catch (error) {
                console.error('Error checking BLAST results:', error);
                isPolling = false;
                break;
            }
        }
    };

    // Start polling
    pollResults();
  };

  const initViewer = (jobId, pdbPath) => {
    if (!viewerRefs.current[jobId]) {
      const stage = new NGL.Stage(`viewer-${jobId}`, { backgroundColor: '#1a2b34' });
      viewerRefs.current[jobId] = stage;

      // Load and display the PDB structure
      const filename = pdbPath.split('\\').pop();
      stage.loadFile(`http://localhost:5000/pdb/${filename}`).then(component => {
        component.addRepresentation('cartoon', {
          color: '#13a4ec',
          roughness: 1.0,
          metalness: 0.0
        });
        component.autoView();
      });
    }
  };

  const formatMetric = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  const toggleJob = (jobId) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  useImperativeHandle(ref, () => ({
    startPolling: (jobId) => {
      // Clear any existing polling interval for this job
      if (pollingIntervals.current[jobId]) {
        clearInterval(pollingIntervals.current[jobId]);
      }

      // Add the job to the list if it's not already there
      setJobs(prevJobs => {
        if (!prevJobs.some(job => job.id === jobId)) {
          return [...prevJobs, { id: jobId, status: 'running', progress: 0 }];
        }
        return prevJobs;
      });

      // Start timer for this job
      const timerInterval = startTimer(jobId);

      // Create a new polling interval for this job
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/job-status/${jobId}`);
          const jobStatus = response.data;

          setJobs(prevJobs => {
            const updatedJobs = prevJobs.map(job => {
              if (job.id === jobId) {
                // If this is a BLAST search and we have a RID, check its status
                if (jobStatus.function_name === 'search_similarity' && jobStatus.result?.rid) {
                  checkBlastResults(jobId, jobStatus.result.rid);
                  return {
                    ...job,
                    ...jobStatus,
                    blast_rid: jobStatus.result.rid
                  };
                }
                return { ...job, ...jobStatus };
              }
              return job;
            });

            // Only stop polling if the job is completed or failed
            if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
              // Clean up intervals
              clearInterval(pollingIntervals.current[jobId]);
              clearInterval(timerInterval);
              
              // Update state to remove intervals
              pollingIntervals.current = { ...pollingIntervals.current };
              delete pollingIntervals.current[jobId];
            }

            return updatedJobs;
          });
        } catch (error) {
          console.error('Error polling job status:', error);
          if (error.response && error.response.status === 404) {
            setJobs(prevJobs => {
              const updatedJobs = prevJobs.map(job =>
                job.id === jobId ? { ...job, status: 'failed', error: 'Job not found on server' } : job
              );

              // Clean up intervals on error
              clearInterval(pollingIntervals.current[jobId]);
              clearInterval(timerInterval);
              
              pollingIntervals.current = { ...pollingIntervals.current };
              delete pollingIntervals.current[jobId];
            });
          }
        }
      }, 5000);

      // Store the new interval
      pollingIntervals.current[jobId] = interval;
    },
    stopAllPolling: () => {
      // Clean up all polling intervals and timers
      Object.values(pollingIntervals.current).forEach(interval => clearInterval(interval));
      Object.values(jobTimers.current).forEach(timer => clearInterval(timer));
      pollingIntervals.current = {};
      jobTimers.current = {};
    }
  }));

  useEffect(() => {
    return () => {
      // Cleanup polling intervals on component unmount
      Object.values(pollingIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderJobResults = (job) => {
    if (!job.result) return null;

    switch (job.function_name) {
      case 'search_similarity':
        return <BlastResults results={job.result.results} />;
      case 'search_structure':
        return <FoldSeekResults results={job.result.results} originalPdbPath={job.result.pdb_file} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 px-4">
      {jobs.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">No running jobs</div>
      ) : (
        jobs.map(job => (
          <div key={job.id} className="bg-[#233c48] rounded-lg p-4">
            <button
              onClick={() => toggleJob(job.id)}
              className="w-full text-left flex items-center justify-between cursor-pointer hover:bg-[#1d333d] p-2 rounded transition-colors"
            >
              <div className="flex items-center space-x-2">
                <h4 className="text-white font-medium">{job.title || `Job ${job.id}`}</h4>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
              </div>
              <div className="flex items-center space-x-2">
                {job.status === 'running' && jobTimers.current[job.id] !== undefined && (
                  <span className="text-gray-400 text-sm">
                    {formatTime(jobTimers.current[job.id])}
                  </span>
                )}
                {job.blast_rid && (
                  <span className="text-gray-400 text-sm">
                    RID: {job.blast_rid}
                  </span>
                )}
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedJobs[job.id] ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedJobs[job.id] && (
              <>
                <p className="text-sm text-gray-300 mb-2">{job.description || 'Processing...'}</p>
                {job.progress !== undefined && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className="bg-[#13a4ec] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
                {job.status === 'completed' && job.result && (
                  <div className="mt-3 border-t border-[#344752] pt-3">
                    <h5 className="text-white text-sm font-medium mb-2">Result:</h5>
                    {job.result.sequence && (
                      <div className="bg-[#1a2b34] rounded-lg p-3 mb-2">
                        <p className="text-sm font-mono text-[#13a4ec] break-all">{job.result.sequence}</p>
                      </div>
                    )}
                    {job.result.pdb_file && (
                      <>
                        <div
                          id={`viewer-${job.id}`}
                          className="w-full h-[300px] rounded-lg mb-3 bg-[#1a2b34]"
                          ref={(el) => {
                            if (el) {
                              initViewer(job.id, job.result.pdb_file);
                            }
                          }}
                        />
                        {job.result.metrics && (
                          <div className="grid grid-cols-2 gap-3 bg-[#1a2b34] p-3 rounded-lg">
                            {Object.entries(job.result.metrics).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-300 text-sm capitalize">{key}:</span>
                                <span className="text-[#13a4ec] text-sm font-medium">{formatMetric(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {renderJobResults(job)}
                    {job.result.info && (
                      <p className="text-sm text-gray-300 mt-2">{job.result.info}</p>
                    )}
                  </div>
                )}
                {job.status === 'failed' && job.error && (
                  <div className="mt-3 text-red-400 text-sm">
                    Error: {job.error}
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
});

export default JobStatus; 