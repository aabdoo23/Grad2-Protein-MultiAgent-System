import { 
  JOB_STATUS, 
  TRAINING_STAGES, 
  FILE_VALIDATION,
  ERROR_MESSAGES 
} from './finetuningConstants';

/**
 * Fine-tuning utility functions
 */

/**
 * Format job status for display
 * @param {string} status - Job status
 * @returns {object} Formatted status with color and display text
 */
export const formatJobStatus = (status) => {
  const statusConfig = {
    [JOB_STATUS.PENDING]: {
      text: 'Pending',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      icon: '⏳'
    },
    [JOB_STATUS.RUNNING]: {
      text: 'Running',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      icon: '🔄'
    },
    [JOB_STATUS.COMPLETED]: {
      text: 'Completed',
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      icon: '✅'
    },
    [JOB_STATUS.FAILED]: {
      text: 'Failed',
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      icon: '❌'
    },
    [JOB_STATUS.CANCELLED]: {
      text: 'Cancelled',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      icon: '⏹️'
    }
  };

  return statusConfig[status] || {
    text: 'Unknown',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: '❓'
  };
};

/**
 * Get current training stage based on progress
 * @param {number} progress - Progress percentage (0-100)
 * @returns {object} Current training stage
 */
export const getCurrentTrainingStage = (progress) => {
  for (const [key, stage] of Object.entries(TRAINING_STAGES)) {
    if (progress >= stage.minProgress && progress <= stage.maxProgress) {
      return { key, ...stage };
    }
  }
  return { key: 'UNKNOWN', name: 'Unknown', description: 'Unknown stage' };
};

/**
 * Format progress percentage for display
 * @param {number} progress - Progress percentage
 * @returns {string} Formatted progress string
 */
export const formatProgress = (progress) => {
  if (typeof progress !== 'number') return '0%';
  return `${Math.round(progress)}%`;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration for display
 * @param {string|Date} startTime - Start time
 * @param {string|Date} [endTime] - End time (defaults to now)
 * @returns {string} Formatted duration
 */
export const formatDuration = (startTime, endTime = new Date()) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  
  if (diffMs < 0) return 'N/A';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  } else if (diffMins > 0) {
    return `${diffMins}m ${diffSecs % 60}s`;
  } else {
    return `${diffSecs}s`;
  }
};

/**
 * Format timestamp for display
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Validate FASTA file
 * @param {File} file - File to validate
 * @returns {object} Validation result
 */
export const validateFastaFile = (file) => {
  const errors = [];
  const warnings = [];
  
  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors, warnings };
  }
  
  // Check file size
  if (file.size > FILE_VALIDATION.FASTA.maxSize) {
    errors.push(`File size exceeds ${formatFileSize(FILE_VALIDATION.FASTA.maxSize)} limit`);
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!FILE_VALIDATION.FASTA.allowedExtensions.includes(extension)) {
    warnings.push(`Unexpected file extension: ${extension}. Expected: ${FILE_VALIDATION.FASTA.allowedExtensions.join(', ')}`);
  }
  
  // Check MIME type
  if (file.type && !FILE_VALIDATION.FASTA.mimeTypes.includes(file.type)) {
    warnings.push(`Unexpected file type: ${file.type}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Parse FASTA content to count sequences
 * @param {string} content - FASTA file content
 * @returns {object} Parsing result
 */
export const parseFastaContent = (content) => {
  try {
    const lines = content.split('\n');
    let sequenceCount = 0;
    let currentSequence = '';
    let sequences = [];
    let totalLength = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('>')) {
        // Header line
        if (currentSequence) {
          sequences.push(currentSequence);
          totalLength += currentSequence.length;
          currentSequence = '';
        }
        sequenceCount++;
      } else if (trimmedLine) {
        // Sequence line
        currentSequence += trimmedLine;
      }
    }
    
    // Don't forget the last sequence
    if (currentSequence) {
      sequences.push(currentSequence);
      totalLength += currentSequence.length;
    }
    
    const avgLength = sequenceCount > 0 ? Math.round(totalLength / sequenceCount) : 0;
    
    return {
      isValid: sequenceCount > 0,
      sequenceCount,
      averageLength: avgLength,
      totalLength,
      sequences: sequences.slice(0, 5), // First 5 sequences for preview
      errors: sequenceCount === 0 ? ['No valid sequences found in FASTA file'] : []
    };
  } catch (error) {
    return {
      isValid: false,
      sequenceCount: 0,
      averageLength: 0,
      totalLength: 0,
      sequences: [],
      errors: [`Error parsing FASTA file: ${error.message}`]
    };
  }
};

/**
 * Generate job summary
 * @param {object} job - Job object
 * @returns {object} Job summary
 */
export const generateJobSummary = (job) => {
  const status = formatJobStatus(job.status);
  const stage = getCurrentTrainingStage(job.progress || 0);
  const duration = formatDuration(job.created_at, job.status === JOB_STATUS.COMPLETED ? job.updated_at : new Date());
  
  return {
    ...job,
    statusFormatted: status,
    currentStage: stage,
    durationFormatted: duration,
    progressFormatted: formatProgress(job.progress),
    createdAtFormatted: formatTimestamp(job.created_at),
    updatedAtFormatted: formatTimestamp(job.updated_at)
  };
};

/**
 * Calculate estimated time remaining
 * @param {number} progress - Current progress (0-100)
 * @param {string} startTime - Job start time
 * @returns {string} Estimated time remaining
 */
export const calculateETA = (progress, startTime) => {
  if (!progress || progress <= 0) return 'Calculating...';
  if (progress >= 100) return 'Complete';
  
  const elapsed = new Date() - new Date(startTime);
  const totalEstimated = (elapsed / progress) * 100;
  const remaining = totalEstimated - elapsed;
  
  if (remaining <= 0) return 'Almost done';
  
  const remainingMins = Math.round(remaining / (1000 * 60));
  
  if (remainingMins < 1) return 'Less than 1 minute';
  if (remainingMins < 60) return `~${remainingMins} minutes`;
  
  const hours = Math.floor(remainingMins / 60);
  const mins = remainingMins % 60;
  return `~${hours}h ${mins}m`;
};

/**
 * Extract error information from API response
 * @param {Error|object} error - Error object or API response
 * @returns {object} Formatted error information
 */
export const extractErrorInfo = (error) => {
  let message = 'An unknown error occurred';
  let details = null;
  let type = 'unknown';
  
  if (error instanceof Error) {
    message = error.message;
    type = 'client';
  } else if (error && typeof error === 'object') {
    if (error.detail) {
      message = error.detail;
      type = 'server';
    } else if (error.message) {
      message = error.message;
      type = 'api';
    }
    details = error;
  }
  
  // Check for common error patterns
  if (message.includes('Network')) {
    type = 'network';
    message = ERROR_MESSAGES.SERVER_OFFLINE;
  } else if (message.includes('404')) {
    type = 'not_found';
  } else if (message.includes('401') || message.includes('403')) {
    type = 'permission';
    message = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
  } else if (message.includes('413') || message.includes('file size')) {
    type = 'file_size';
  }
  
  return {
    message,
    details,
    type
  };
};

/**
 * Generate unique job name
 * @param {string} model - Model name
 * @param {string} [prefix='job'] - Name prefix
 * @returns {string} Unique job name
 */
export const generateJobName = (model, prefix = 'job') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${model}_${timestamp}_${randomSuffix}`;
};

/**
 * Sanitize filename for download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Check if job is active (running or pending)
 * @param {string} status - Job status
 * @returns {boolean} Whether job is active
 */
export const isJobActive = (status) => {
  return status === JOB_STATUS.PENDING || status === JOB_STATUS.RUNNING;
};

/**
 * Check if job is completed
 * @param {string} status - Job status
 * @returns {boolean} Whether job is completed
 */
export const isJobCompleted = (status) => {
  return status === JOB_STATUS.COMPLETED;
};

/**
 * Check if job has failed
 * @param {string} status - Job status
 * @returns {boolean} Whether job has failed
 */
export const isJobFailed = (status) => {
  return status === JOB_STATUS.FAILED;
};

/**
 * Get appropriate action buttons for job status
 * @param {string} status - Job status
 * @returns {object} Available actions
 */
export const getJobActions = (status) => {
  return {
    canCancel: isJobActive(status),
    canDelete: !isJobActive(status),
    canDownload: isJobCompleted(status),
    canRetry: isJobFailed(status),
    canViewLogs: status !== JOB_STATUS.PENDING
  };
};
