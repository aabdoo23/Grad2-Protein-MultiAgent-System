import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import { JobStatusBadge, DeleteButton, LoadingSpinner } from './CommonComponents';

export const ModelCard = ({ model, onDelete, isDeleting = false }) => {
  return (
    <div className="bg-[#233c48] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">
            Model: {model.request_data?.model_key || 'Unknown'}
          </h3>
          <p className="text-gray-400 text-sm mb-1">
            Job ID: {model.runpod_id}
          </p>
          <p className="text-gray-400 text-sm mb-2">
            Mode: {model.request_data?.finetune_mode || 'Unknown'}
          </p>
          {model.request_data?.n_trials && (
            <p className="text-gray-400 text-sm">
              Trials: {model.request_data.n_trials}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <JobStatusBadge status={model.status} />
          <DeleteButton 
            onClick={() => onDelete(model.runpod_id)}
            disabled={isDeleting}
          />
        </div>
      </div>
    </div>
  );
};

export const JobCard = ({ job, pollingJobs = new Set() }) => {
  const isPolling = pollingJobs.has(job.runpod_id);
  
  return (
    <div className="bg-[#233c48] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">
            {job.request_data?.model_key || 'Generation Job'}
          </h3>
          <p className="text-gray-400 text-sm mb-1">
            Job ID: {job.runpod_id}
          </p>
          <p className="text-gray-400 text-sm">
            Created: {new Date(job.internal_id?.slice(-13) || Date.now()).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JobStatusBadge status={job.status} />
          {isPolling && <LoadingSpinner className="text-blue-400" />}
        </div>
      </div>
      
      {job.output && (
        <div className="mt-3 bg-[#1a2d35] rounded p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Output:</h4>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {typeof job.output === 'string' 
              ? job.output 
              : JSON.stringify(job.output, null, 2)
            }
          </pre>
        </div>
      )}
    </div>
  );
};

export const ModelsList = ({ 
  models, 
  onDelete, 
  onRefresh, 
  isLoading = false,
  title = "My Fine-tuned Models" 
}) => {
  return (
    <div className="bg-[#1a2d35] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-[#233c48] hover:bg-[#2a4653] disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
        >
          <FontAwesomeIcon 
            icon={faRefresh} 
            className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} 
          />
          Refresh
        </button>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">No fine-tuned models yet.</p>
          <p className="text-gray-500 text-sm">Start by creating one in the Fine-tune tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <ModelCard 
              key={model.runpod_id} 
              model={model} 
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const JobsList = ({ 
  jobs, 
  pollingJobs = new Set(), 
  onRefresh, 
  isLoading = false,
  title = "Job History" 
}) => {
  return (
    <div className="bg-[#1a2d35] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-[#233c48] hover:bg-[#2a4653] disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
        >
          <FontAwesomeIcon 
            icon={faRefresh} 
            className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} 
          />
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No jobs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard 
              key={job.runpod_id} 
              job={job} 
              pollingJobs={pollingJobs}
            />
          ))}
        </div>
      )}
    </div>
  );
};
