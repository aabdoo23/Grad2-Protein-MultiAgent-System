import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import axios from 'axios';

const JobStatus = forwardRef((props, ref) => {
  const [jobs, setJobs] = useState([]);
  const [pollingIntervals, setPollingIntervals] = useState({});

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  useImperativeHandle(ref, () => ({
    startPolling: (jobId) => {
      if (pollingIntervals[jobId]) {
        clearInterval(pollingIntervals[jobId]);
      }

      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/job_status/${jobId}`);
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
      {jobs.map(job => (
        <div key={job.id} className="bg-[#233c48] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">{job.title}</h4>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
          </div>
          <p className="text-sm text-gray-300 mb-2">{job.description}</p>
          {job.progress && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[#13a4ec] h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default JobStatus; 