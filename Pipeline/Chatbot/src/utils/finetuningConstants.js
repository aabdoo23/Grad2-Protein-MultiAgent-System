/**
 * Fine-tuning related constants and configurations
 */

// Job statuses
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Job types
export const JOB_TYPE = {
  FINETUNE: 'finetune',
  GENERATE: 'generate'
};

// Default fine-tuning parameters
export const DEFAULT_FINETUNE_PARAMS = {
  use_lora: true,
  use_optuna: true,
  n_trials: 5,
  learning_rate: 5e-5,
  per_device_train_batch_size: 4,
  num_train_epochs: 2,
  weight_decay: 0.01,
  optuna_lr_min: 1e-7,
  optuna_lr_max: 1e-6,
  optuna_batch_sizes: [4, 8],
  optuna_epochs_min: 1,
  optuna_epochs_max: 3,
  optuna_weight_decay_min: 0.0,
  optuna_weight_decay_max: 0.2
};

// Default generation parameters
export const DEFAULT_GENERATION_PARAMS = {
  max_new_tokens: 200,
  num_return_sequences: 1,
  temperature: 1.0,
  top_p: 0.9,
  top_k: 50
};

// Available base models (this should be fetched from the API in practice)
export const BASE_MODELS = [
  'progen2-small',
  'progen2-medium',
  'progen2-large',
  'progen2-xl'
];

// Training stages for progress tracking
export const TRAINING_STAGES = {
  INITIALIZATION: {
    name: 'Initialization',
    description: 'Loading model and tokenizer',
    minProgress: 0,
    maxProgress: 20
  },
  DATA_PROCESSING: {
    name: 'Data Processing',
    description: 'Processing FASTA sequences and creating datasets',
    minProgress: 20,
    maxProgress: 50
  },
  HYPERPARAMETER_SEARCH: {
    name: 'Hyperparameter Search',
    description: 'Optimizing hyperparameters with Optuna',
    minProgress: 50,
    maxProgress: 70
  },
  TRAINING: {
    name: 'Training',
    description: 'Training the model with optimized parameters',
    minProgress: 70,
    maxProgress: 95
  },
  FINALIZATION: {
    name: 'Finalization',
    description: 'Saving model and cleaning up',
    minProgress: 95,
    maxProgress: 100
  }
};

// Error messages
export const ERROR_MESSAGES = {
  SERVER_OFFLINE: 'Fine-tuning server is offline. Please check your connection.',
  FILE_UPLOAD_FAILED: 'Failed to upload FASTA file. Please check the file format.',
  INVALID_MODEL: 'Selected model is not available. Please choose a different model.',
  JOB_NOT_FOUND: 'Job not found. It may have been deleted or never existed.',
  GENERATION_FAILED: 'Sequence generation failed. Please check your parameters.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  QUOTA_EXCEEDED: 'You have exceeded your usage quota. Please try again later.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  FINETUNE_STARTED: 'Fine-tuning job started successfully!',
  GENERATION_STARTED: 'Sequence generation started successfully!',
  MODEL_DELETED: 'Model deleted successfully!',
  JOB_CANCELLED: 'Job cancelled successfully!'
};

// File validation
export const FILE_VALIDATION = {
  FASTA: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.fasta', '.fa', '.fas', '.txt'],
    mimeTypes: ['text/plain', 'application/octet-stream']
  }
};

// Polling configuration
export const POLLING_CONFIG = {
  DEFAULT_INTERVAL: 30000, // 30 seconds
  MAX_RETRIES: 3,
  TIMEOUT: 30000 // 30 seconds
};
