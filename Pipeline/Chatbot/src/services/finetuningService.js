import { FINETUNING_SERVER_BASE_URL } from '../config/appConfig';

/**
 * Fine-tuning API Service
 * Provides methods to interact with the protein fine-tuning server
 */
class FinetuningService {
  constructor() {
    this.baseURL = FINETUNING_SERVER_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generic API request handler with error handling
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: this.defaultHeaders,
      mode: 'cors',
      credentials: 'omit',
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handle file upload requests
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {object} options - Additional options
   * @returns {Promise<object>} Response data
   */
  async uploadRequest(endpoint, formData, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'POST',
      body: formData,
      ...options,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        // Also don't include the default JSON content-type
        ...options.headers,
      },
      // Add mode and credentials for CORS
      mode: 'cors',
      credentials: 'omit',
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Upload request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // ========== BASIC ENDPOINTS ==========

  /**
   * Get root API information
   * @returns {Promise<object>} API information
   */
  async getRoot() {
    return await this.apiRequest('/');
  }

  /**
   * Get list of available base models
   * @returns {Promise<object>} Available models
   */
  async getAvailableModels() {
    return await this.apiRequest('/models');
  }

  /**
   * Health check endpoint
   * @returns {Promise<object>} Health status
   */
  async getHealth() {
    return await this.apiRequest('/health');
  }

  // ========== FINE-TUNING ENDPOINTS ==========

  /**
   * Start a fine-tuning job
   * @param {object} params - Fine-tuning parameters
   * @param {string} params.model - Model name to finetune
   * @param {File} params.fastaFile - FASTA file containing protein sequences
   * @param {string} params.username - Username of the signed-in user
   * @param {string} [params.output_dir] - Output directory for trained model
   * @param {boolean} [params.use_lora=true] - Whether to use LoRA fine-tuning
   * @param {boolean} [params.use_optuna=true] - Whether to use Optuna hyperparameter optimization
   * @param {number} [params.n_trials=5] - Number of Optuna trials
   * @param {number} [params.learning_rate=5e-5] - Learning rate
   * @param {number} [params.per_device_train_batch_size=4] - Batch size per device
   * @param {number} [params.num_train_epochs=2] - Number of training epochs
   * @param {number} [params.weight_decay=0.01] - Weight decay
   * @param {number} [params.optuna_lr_min=1e-7] - Minimum learning rate for Optuna search
   * @param {number} [params.optuna_lr_max=1e-6] - Maximum learning rate for Optuna search
   * @param {number[]} [params.optuna_batch_sizes=[4, 8]] - Batch size options for Optuna
   * @param {number} [params.optuna_epochs_min=1] - Minimum epochs for Optuna
   * @param {number} [params.optuna_epochs_max=3] - Maximum epochs for Optuna
   * @param {number} [params.optuna_weight_decay_min=0.0] - Minimum weight decay for Optuna
   * @param {number} [params.optuna_weight_decay_max=0.2] - Maximum weight decay for Optuna
   * @returns {Promise<object>} Job response with job_id
   */
  async startFinetuning(params) {
    const {
      fastaFile,
      model,
      username,
      output_dir = null,
      use_lora = true,
      use_optuna = true,
      n_trials = 5,
      learning_rate = 5e-5,
      per_device_train_batch_size = 4,
      num_train_epochs = 2,
      weight_decay = 0.01,
      optuna_lr_min = 1e-7,
      optuna_lr_max = 1e-6,
      optuna_batch_sizes = [4, 8],
      optuna_epochs_min = 1,
      optuna_epochs_max = 3,
      optuna_weight_decay_min = 0.0,
      optuna_weight_decay_max = 0.2,
    } = params;

    if (!fastaFile || !model || !username) {
      throw new Error('FASTA file, model, and username are required');
    }

    const formData = new FormData();
    
    // Add the file
    formData.append('fasta_file', fastaFile);
    
    // Add each parameter as individual form fields (FastAPI expects this format)
    formData.append('model', model);
    formData.append('user_name', username);
    if (output_dir) formData.append('output_dir', output_dir);
    formData.append('use_lora', use_lora.toString());
    formData.append('use_optuna', use_optuna.toString());
    formData.append('n_trials', n_trials.toString());
    formData.append('learning_rate', learning_rate.toString());
    formData.append('per_device_train_batch_size', per_device_train_batch_size.toString());
    formData.append('num_train_epochs', num_train_epochs.toString());
    formData.append('weight_decay', weight_decay.toString());
    formData.append('optuna_lr_min', optuna_lr_min.toString());
    formData.append('optuna_lr_max', optuna_lr_max.toString());
    formData.append('optuna_batch_sizes', JSON.stringify(optuna_batch_sizes));
    formData.append('optuna_epochs_min', optuna_epochs_min.toString());
    formData.append('optuna_epochs_max', optuna_epochs_max.toString());
    formData.append('optuna_weight_decay_min', optuna_weight_decay_min.toString());
    formData.append('optuna_weight_decay_max', optuna_weight_decay_max.toString());

    return await this.uploadRequest('/finetune', formData);
  }

  // ========== FINETUNED MODELS ENDPOINTS ==========

  /**
   * Get all finetuned models, optionally filtered by user
   * @param {string} [userName] - Optional username to filter by
   * @returns {Promise<object>} List of finetuned models
   */
  async getFinetunedModels(userName = null) {
    const queryParams = userName ? `?user_name=${encodeURIComponent(userName)}` : '';
    return await this.apiRequest(`/finetuned-models${queryParams}`);
  }

  /**
   * Get finetuned models for a specific user
   * @param {string} userName - Username to get models for
   * @returns {Promise<object>} List of user's finetuned models
   */
  async getUserFinetunedModels(userName) {
    if (!userName) {
      throw new Error('Username is required');
    }
    return await this.apiRequest(`/finetuned-models/${encodeURIComponent(userName)}`);
  }

  // ========== GENERATION ENDPOINTS ==========

  /**
   * Generate protein sequences using a fine-tuned model
   * @param {object} params - Generation parameters
   * @param {string} params.model_name - Base model name
   * @param {string} params.model_dir - Path to fine-tuned model directory
   * @param {string} params.prompt - Input prompt for generation
   * @param {number} [params.max_new_tokens=200] - Maximum number of new tokens to generate
   * @param {number} [params.num_return_sequences=1] - Number of sequences to generate
   * @param {number} [params.temperature=1.0] - Sampling temperature
   * @param {number} [params.top_p=0.9] - Top-p sampling parameter
   * @param {number} [params.top_k=50] - Top-k sampling parameter
   * @returns {Promise<object>} Generated sequences
   */
  async generateSequence(params) {
    const {
      model_name,
      model_dir,
      prompt,
      max_new_tokens = 200,
      num_return_sequences = 1,
      temperature = 1.0,
      top_p = 0.9,
      top_k = 50,
    } = params;

    if (!model_name || !model_dir || !prompt) {
      throw new Error('model_name, model_dir, and prompt are required');
    }

    return await this.apiRequest('/generate', {
      method: 'POST',
      body: JSON.stringify({
        model_name,
        model_dir,
        prompt,
        max_new_tokens,
        num_return_sequences,
        temperature,
        top_p,
        top_k,
      }),
    });
  }

  /**
   * Generate protein sequences using a base model directly (without fine-tuning)
   * @param {object} params - Generation parameters
   * @param {string} params.model_name - Base model name
   * @param {string} params.prompt - Input prompt for generation
   * @param {number} [params.max_new_tokens=200] - Maximum number of new tokens to generate
   * @param {number} [params.num_return_sequences=1] - Number of sequences to generate
   * @param {number} [params.temperature=1.0] - Sampling temperature
   * @param {number} [params.top_p=0.9] - Top-p sampling parameter
   * @param {number} [params.top_k=50] - Top-k sampling parameter
   * @returns {Promise<object>} Generated sequences
   */
  async generateWithBaseModel(params) {
    const {
      model_name,
      prompt,
      max_new_tokens = 200,
      num_return_sequences = 1,
      temperature = 1.0,
      top_p = 0.9,
      top_k = 50,
    } = params;

    if (!model_name || !prompt) {
      throw new Error('model_name and prompt are required');
    }

    return await this.apiRequest('/generate-base', {
      method: 'POST',
      body: JSON.stringify({
        model_name,
        prompt,
        max_new_tokens,
        num_return_sequences,
        temperature,
        top_p,
        top_k,
      }),
    });
  }

  // ========== JOB MANAGEMENT ENDPOINTS ==========

  /**
   * Get the status of a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} Job status
   */
  async getJobStatus(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    return await this.apiRequest(`/status/${jobId}`);
  }

  /**
   * List all jobs with their current status
   * @param {object} params - Query parameters
   * @param {number} [params.limit=100] - Maximum number of jobs to return
   * @param {string} [params.status] - Filter by job status
   * @returns {Promise<object>} List of jobs
   */
  async listJobs(params = {}) {
    const { limit = 100, status } = params;
    
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (status) {
      queryParams.append('status', status);
    }

    return await this.apiRequest(`/jobs?${queryParams.toString()}`);
  }

  /**
   * Delete a job from storage
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteJob(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    return await this.apiRequest(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get detailed training logs for a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} Training logs
   */
  async getJobTrainingLogs(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    return await this.apiRequest(`/jobs/${jobId}/logs`);
  }

  // ========== STATISTICS ENDPOINTS ==========

  /**
   * Get comprehensive API usage statistics
   * @returns {Promise<object>} API statistics
   */
  async getStatistics() {
    return await this.apiRequest('/statistics');
  }

  // ========== STORAGE MANAGEMENT ENDPOINTS ==========

  /**
   * Get information about storage organization and disk usage
   * @returns {Promise<object>} Storage information
   */
  async getStorageInfo() {
    return await this.apiRequest('/storage/info');
  }

  /**
   * List all job directories and their contents
   * @returns {Promise<object>} Job directories information
   */
  async listJobDirectories() {
    return await this.apiRequest('/storage/jobs');
  }

  /**
   * Clean up all files associated with a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} Cleanup result
   */
  async cleanupJobFiles(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    return await this.apiRequest(`/storage/cleanup/${jobId}`, {
      method: 'DELETE',
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if the fine-tuning server is online
   * @returns {Promise<boolean>} Server online status
   */
  async isServerOnline() {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.warn('Fine-tuning server is offline:', error.message);
      return false;
    }
  }

  /**
   * Poll job status until completion
   * @param {string} jobId - Job ID
   * @param {function} onProgress - Progress callback function
   * @param {number} [interval=5000] - Polling interval in milliseconds
   * @returns {Promise<object>} Final job status
   */
  async pollJobStatus(jobId, onProgress = null, interval = 5000) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
          } else {
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Get job status with training progress
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} Job status with detailed progress
   */
  async getJobProgress(jobId) {
    try {
      const [status, logs] = await Promise.all([
        this.getJobStatus(jobId),
        this.getJobTrainingLogs(jobId).catch(() => ({ training_logs: [] }))
      ]);

      return {
        ...status,
        training_logs: logs.training_logs || [],
        detailed_progress: this.calculateDetailedProgress(status, logs.training_logs || [])
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate detailed progress from status and logs
   * @param {object} status - Job status
   * @param {array} trainingLogs - Training logs
   * @returns {object} Detailed progress information
   */
  calculateDetailedProgress(status, trainingLogs) {
    const progress = {
      overall_progress: status.progress || 0,
      current_stage: status.message || 'Unknown',
      stages: {
        initialization: status.progress >= 10,
        data_processing: status.progress >= 30,
        training: status.progress >= 70 && status.progress < 100,
        completion: status.progress === 100
      },
      training_metrics: []
    };

    // Extract training metrics from logs
    if (trainingLogs && trainingLogs.length > 0) {
      progress.training_metrics = trainingLogs
        .filter(log => log.loss !== undefined)
        .map(log => ({
          epoch: log.epoch,
          step: log.step,
          loss: log.loss,
          learning_rate: log.learning_rate,
          timestamp: log.timestamp
        }));
    }

    return progress;
  }

  /**
   * Validate fine-tuning parameters
   * @param {object} params - Parameters to validate
   * @returns {object} Validation result
   */
  validateFinetuningParams(params) {
    const errors = [];
    const warnings = [];

    // Required parameters
    if (!params.model) {
      errors.push('Model is required');
    }

    if (!params.fastaFile) {
      errors.push('FASTA file is required');
    }

    if (!params.username) {
      errors.push('Username is required');
    }

    // Validate numeric parameters
    if (params.learning_rate && (params.learning_rate <= 0 || params.learning_rate > 1)) {
      warnings.push('Learning rate should be between 0 and 1');
    }

    if (params.num_train_epochs && params.num_train_epochs < 1) {
      warnings.push('Number of epochs should be at least 1');
    }

    if (params.per_device_train_batch_size && params.per_device_train_batch_size < 1) {
      warnings.push('Batch size should be at least 1');
    }

    // Validate Optuna parameters
    if (params.use_optuna) {
      if (params.optuna_lr_min >= params.optuna_lr_max) {
        errors.push('Optuna minimum learning rate must be less than maximum');
      }

      if (params.optuna_epochs_min >= params.optuna_epochs_max) {
        errors.push('Optuna minimum epochs must be less than maximum');
      }

      if (params.n_trials < 1) {
        warnings.push('Number of Optuna trials should be at least 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate generation parameters
   * @param {object} params - Parameters to validate
   * @returns {object} Validation result
   */
  validateGenerationParams(params) {
    const errors = [];
    const warnings = [];

    // Required parameters
    if (!params.model_name) {
      errors.push('Model name is required');
    }

    if (!params.model_dir) {
      errors.push('Model directory is required');
    }

    if (!params.prompt) {
      errors.push('Prompt is required');
    }

    // Validate numeric parameters
    if (params.max_new_tokens && params.max_new_tokens < 1) {
      warnings.push('Max new tokens should be at least 1');
    }

    if (params.temperature && (params.temperature <= 0 || params.temperature > 2)) {
      warnings.push('Temperature should be between 0 and 2');
    }

    if (params.top_p && (params.top_p <= 0 || params.top_p > 1)) {
      warnings.push('Top-p should be between 0 and 1');
    }

    if (params.top_k && params.top_k < 1) {
      warnings.push('Top-k should be at least 1');
    }

    if (params.num_return_sequences && params.num_return_sequences < 1) {
      warnings.push('Number of return sequences should be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate base model generation parameters
   * @param {object} params - Parameters to validate
   * @returns {object} Validation result
   */
  validateBaseModelGenerationParams(params) {
    const errors = [];
    const warnings = [];

    // Required parameters for base model generation
    if (!params.model_name) {
      errors.push('Model name is required');
    }

    if (!params.prompt) {
      errors.push('Prompt is required');
    }

    // Validate numeric parameters
    if (params.max_new_tokens && params.max_new_tokens < 1) {
      warnings.push('Max new tokens should be at least 1');
    }

    if (params.temperature && (params.temperature <= 0 || params.temperature > 2)) {
      warnings.push('Temperature should be between 0 and 2');
    }

    if (params.top_p && (params.top_p <= 0 || params.top_p > 1)) {
      warnings.push('Top-p should be between 0 and 1');
    }

    if (params.top_k && params.top_k < 1) {
      warnings.push('Top-k should be at least 1');
    }

    if (params.num_return_sequences && params.num_return_sequences < 1) {
      warnings.push('Number of return sequences should be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create and export a singleton instance
const finetuningService = new FinetuningService();
export default finetuningService;

// Also export the class for custom instances if needed
export { FinetuningService };
