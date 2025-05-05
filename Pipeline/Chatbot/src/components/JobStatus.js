import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as NGL from 'ngl';
import BlastResults from './BlastResults';
import FoldSeekResults from './result-viewers/FoldSeekResults';
import SequenceGenerationResults from './result-viewers/SequenceGenerationResults';
import EvaluationResults from './result-viewers/EvaluationResults';


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
      case 'generate_protein':
        return <SequenceGenerationResults sequence={job.result.sequence} info={job.result.info} />;
      case 'evaluate_structure':
        return <EvaluationResults metrics={job.result.metrics} />;
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