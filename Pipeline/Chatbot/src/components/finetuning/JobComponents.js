import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import { JobStatusBadge, DeleteButton, LoadingSpinner } from './CommonComponents';
import { useTheme } from '../../contexts/ThemeContext';

export const ModelCard = ({ model, onDelete, isDeleting = false }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      className="rounded-lg p-4"
      style={{ backgroundColor: theme.colors.cardBackground }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
            Model: {model.request_data?.model_key || 'Unknown'}
          </h3>
          <p className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
            Job ID: {model.runpod_id}
          </p>
          <p className="text-sm mb-2" style={{ color: theme.colors.textSecondary }}>
            Mode: {model.request_data?.finetune_mode || 'Unknown'}
          </p>
          {model.request_data?.n_trials && (
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
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
  const { theme } = useTheme();
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
      case 'completed': return { color: '#10b981', bg: '#10b981' + '20' };
      case 'failed': return { color: '#ef4444', bg: '#ef4444' + '20' };
      case 'running': return { color: theme.colors.accent, bg: theme.colors.accent + '20' };
      case 'pending': return { color: '#f59e0b', bg: '#f59e0b' + '20' };
      default: return { color: theme.colors.textSecondary, bg: theme.colors.textSecondary + '20' };
    }
  };
  
  const statusColor = getStatusColor(job.status);
  
  return (
    <div 
      className="rounded-lg p-4 border"
      style={{ 
        backgroundColor: theme.colors.cardBackground,
        borderColor: theme.colors.border
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium" style={{ color: theme.colors.textPrimary }}>
              {modelName}
            </h3>
            <span 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                color: statusColor.color,
                backgroundColor: statusColor.bg
              }}
            >
              {job.status}
            </span>
            {isPolling && (
              <LoadingSpinner size="sm" style={{ color: theme.colors.accent }} />
            )}
          </div>
          
          <p className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
            Job ID: {jobId.length > 8 ? `${jobId.substring(0, 8)}...` : jobId}
          </p>
          
          <p className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
            Type: {job.job_type || 'finetune'}
          </p>
          
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Created: {formatTimestamp(job.created_at)}
          </p>
          
          {job.progress !== undefined && job.progress > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: theme.colors.textSecondary }}>
                <span>Progress</span>
                <span>{Math.round(job.progress)}%</span>
              </div>
              <div 
                className="w-full rounded-full h-2"
                style={{ backgroundColor: theme.colors.secondary }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, job.progress))}%`,
                    backgroundColor: job.status === 'failed' ? '#ef4444' : theme.colors.accent
                  }}
                ></div>
              </div>
            </div>
          )}
          
          {job.message && (
            <p className="text-sm mt-2 italic" style={{ color: theme.colors.textSecondary }}>
              {job.message}
            </p>
          )}
          
          {job.error && (
            <p className="text-sm mt-2" style={{ color: '#ef4444' }}>
              Error: {job.error}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {/* Delete button for completed jobs */}
          {job.status === 'completed' && onDelete && (
            <button
              onClick={() => onDelete(jobId)}
              className="text-sm px-2 py-1 rounded border transition-colors"
              style={{
                color: '#ef4444',
                borderColor: '#ef4444' + '50',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#dc2626';
                e.target.style.borderColor = '#dc2626' + '70';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#ef4444';
                e.target.style.borderColor = '#ef4444' + '50';
              }}
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
              className="text-sm px-2 py-1 rounded border transition-colors"
              style={{
                color: '#ef4444',
                borderColor: '#ef4444' + '50',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#dc2626';
                e.target.style.borderColor = '#dc2626' + '70';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#ef4444';
                e.target.style.borderColor = '#ef4444' + '50';
              }}
            >
              {job.status === 'pending' ? 'Cancel' : 'Stop'}
            </button>
          )}
          
          {/* Delete button for failed jobs */}
          {job.status === 'failed' && onDelete && (
            <button
              onClick={() => onDelete(jobId)}
              className="text-sm px-2 py-1 rounded border transition-colors"
              style={{
                color: '#ef4444',
                borderColor: '#ef4444' + '50',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#dc2626';
                e.target.style.borderColor = '#dc2626' + '70';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#ef4444';
                e.target.style.borderColor = '#ef4444' + '50';
              }}
            >
              Delete
            </button>
          )}
          
          {/* Cleanup button for completed jobs */}
          {job.status === 'completed' && onCleanup && (
            <button
              onClick={() => onCleanup(jobId)}
              className="text-sm px-2 py-1 rounded border transition-colors"
              style={{
                color: '#f59e0b',
                borderColor: '#f59e0b' + '50',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#d97706';
                e.target.style.borderColor = '#d97706' + '70';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#f59e0b';
                e.target.style.borderColor = '#f59e0b' + '50';
              }}
            >
              Cleanup
            </button>
          )}
        </div>
      </div>
      
      {/* Additional info for completed jobs */}
      {job.status === 'completed' && job.result && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.colors.border }}>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {job.result.num_sequences && (
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Sequences:</span>
                <span className="ml-1" style={{ color: theme.colors.textPrimary }}>{job.result.num_sequences}</span>
              </div>
            )}
            
            {job.result.model_dir && (
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Model:</span>
                <span className="ml-1" style={{ color: theme.colors.textPrimary }}>Ready</span>
              </div>
            )}
            
            {job.result.best_params?.learning_rate && (
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Learning Rate:</span>
                <span className="ml-1" style={{ color: theme.colors.textPrimary }}>{job.result.best_params.learning_rate}</span>
              </div>
            )}
            
            {job.result.best_params?.per_device_train_batch_size && (
              <div>
                <span style={{ color: theme.colors.textSecondary }}>Batch Size:</span>
                <span className="ml-1" style={{ color: theme.colors.textPrimary }}>{job.result.best_params.per_device_train_batch_size}</span>
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
  const { theme } = useTheme();
  
  return (
    <div 
      className="rounded-lg p-6"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold" style={{ color: theme.colors.textPrimary }}>{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            color: theme.colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.secondary;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = theme.colors.cardBackground;
          }}
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
          <p className="mb-2" style={{ color: theme.colors.textSecondary }}>No fine-tuned models yet.</p>
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Start by creating one in the Fine-tune tab.</p>
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
  const { theme } = useTheme();
  
  return (
    <div 
      className="rounded-lg p-6"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold" style={{ color: theme.colors.textPrimary }}>{title}</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
          style={{ 
            backgroundColor: theme.colors.cardBackground,
            color: theme.colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.secondary;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = theme.colors.cardBackground;
          }}
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
          <p style={{ color: theme.colors.textSecondary }}>No jobs found.</p>
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
