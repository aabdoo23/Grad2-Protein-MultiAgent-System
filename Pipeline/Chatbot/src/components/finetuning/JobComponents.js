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

export const JobCard = ({ job, pollingJobs = new Set(), onDelete, onCleanup }) => {
  const isPolling = pollingJobs.has(job.job_id);
  
  // Handle both old format (runpod_id) and new format (job_id)
  const jobId = job.job_id || job.runpod_id;
  const modelName = job.result?.best_params?.model || 
                   job.request_data?.model_key || 
                   job.hyperparameters?.model || 
                   'Unknown';
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      case 'running': return 'text-blue-400 bg-blue-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };
  
  return (
    <div className="bg-[#233c48] rounded-lg p-4 border border-gray-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-medium">
              {modelName}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
            {isPolling && (
              <LoadingSpinner size="sm" className="text-blue-400" />
            )}
          </div>
          
          <p className="text-gray-400 text-sm mb-1">
            Job ID: {jobId.length > 8 ? `${jobId.substring(0, 8)}...` : jobId}
          </p>
          
          <p className="text-gray-400 text-sm mb-1">
            Type: {job.job_type || 'finetune'}
          </p>
          
          <p className="text-gray-400 text-sm">
            Created: {formatTimestamp(job.created_at)}
          </p>
          
          {job.progress !== undefined && job.progress > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Progress</span>
                <span>{Math.round(job.progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {job.message && (
            <p className="text-gray-300 text-sm mt-2 italic">
              {job.message}
            </p>
          )}
          
          {job.error && (
            <p className="text-red-400 text-sm mt-2">
              Error: {job.error}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {/* Delete button for completed jobs */}
          {job.status === 'completed' && onDelete && (
            <button
              onClick={() => onDelete(jobId)}
              className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
            >
              Delete
            </button>
          )}
          
          {/* Cancel/Stop button for running jobs */}
          {(job.status === 'running' || job.status === 'pending') && onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this running job? This action cannot be undone.')) {
                  onDelete(jobId);
                }
              }}
              className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
            >
              {job.status === 'pending' ? 'Cancel' : 'Stop'}
            </button>
          )}
          
          {/* Delete button for failed jobs */}
          {job.status === 'failed' && onDelete && (
            <button
              onClick={() => onDelete(jobId)}
              className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
            >
              Delete
            </button>
          )}
          
          {/* Cleanup button for completed jobs */}
          {job.status === 'completed' && onCleanup && (
            <button
              onClick={() => onCleanup(jobId)}
              className="text-orange-400 hover:text-orange-300 text-sm px-2 py-1 rounded border border-orange-400/30 hover:border-orange-300/50 transition-colors"
            >
              Cleanup
            </button>
          )}
        </div>
      </div>
      
      {/* Additional info for completed jobs */}
      {job.status === 'completed' && job.result && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {job.result.num_sequences && (
              <div>
                <span className="text-gray-400">Sequences:</span>
                <span className="text-white ml-1">{job.result.num_sequences}</span>
              </div>
            )}
            
            {job.result.model_dir && (
              <div>
                <span className="text-gray-400">Model:</span>
                <span className="text-white ml-1">Ready</span>
              </div>
            )}
            
            {job.result.best_params?.learning_rate && (
              <div>
                <span className="text-gray-400">Learning Rate:</span>
                <span className="text-white ml-1">{job.result.best_params.learning_rate}</span>
              </div>
            )}
            
            {job.result.best_params?.per_device_train_batch_size && (
              <div>
                <span className="text-gray-400">Batch Size:</span>
                <span className="text-white ml-1">{job.result.best_params.per_device_train_batch_size}</span>
              </div>
            )}
          </div>
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
  onDelete,
  onCleanup,
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
              key={job.job_id || job.runpod_id} 
              job={job} 
              pollingJobs={pollingJobs}
              onDelete={onDelete}
              onCleanup={onCleanup}
            />
          ))}
        </div>
      )}
    </div>
  );
};
