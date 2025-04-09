import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as NGL from 'ngl';

const JobStatus = forwardRef((props, ref) => {
  const [jobs, setJobs] = useState([]);
  const [pollingIntervals, setPollingIntervals] = useState({});
  const viewerRefs = useRef({});

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

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

  useImperativeHandle(ref, () => ({
    startPolling: (jobId) => {
      if (pollingIntervals[jobId]) {
        clearInterval(pollingIntervals[jobId]);
      }

      // Add the job to the list if it's not already there
      setJobs(prevJobs => {
        if (!prevJobs.some(job => job.id === jobId)) {
          return [...prevJobs, { id: jobId, status: 'running', progress: 0 }];
        }
        return prevJobs;
      });

      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/job-status/${jobId}`);
          const jobStatus = response.data;

          setJobs(prevJobs => {
            const updatedJobs = prevJobs.map(job => 
              job.id === jobId ? { ...job, ...jobStatus } : job
            );

            if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
              clearInterval(pollingIntervals[jobId]);
              const newPollingIntervals = { ...pollingIntervals };
              delete newPollingIntervals[jobId];
              setPollingIntervals(newPollingIntervals);
            }

            return updatedJobs;
          });
        } catch (error) {
          console.error('Error polling job status:', error);
          
          // If the job is not found, mark it as failed
          if (error.response && error.response.status === 404) {
            setJobs(prevJobs => {
              const updatedJobs = prevJobs.map(job => 
                job.id === jobId ? { ...job, status: 'failed', error: 'Job not found on server' } : job
              );
              
              // Stop polling for this job
              clearInterval(pollingIntervals[jobId]);
              const newPollingIntervals = { ...pollingIntervals };
              delete newPollingIntervals[jobId];
              setPollingIntervals(newPollingIntervals);
              
              return updatedJobs;
            });
          }
        }
      }, 5000); // Poll every 5 seconds

      setPollingIntervals(prev => ({
        ...prev,
        [jobId]: interval
      }));
    },
    stopAllPolling: () => {
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
      setPollingIntervals({});
    }
  }));

  useEffect(() => {
    return () => {
      // Cleanup polling intervals on component unmount
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
    };
  }, [pollingIntervals]);

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

  return (
    <div className="space-y-4 px-4">
      {jobs.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">No running jobs</div>
      ) : (
        jobs.map(job => (
          <div key={job.id} className="bg-[#233c48] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium">{job.title || `Job ${job.id}`}</h4>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
            </div>
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
                      ref={() => initViewer(job.id, job.result.pdb_file)}
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
          </div>
        ))
      )}
    </div>
  );
});

export default JobStatus; 