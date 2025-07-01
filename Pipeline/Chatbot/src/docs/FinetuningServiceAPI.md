# Fine-tuning Service API Documentation

## Overview

The Fine-tuning Service provides a comprehensive interface to interact with the protein fine-tuning server hosted at the `FINETUNING_SERVER_BASE_URL`. This service handles all API communication, error handling, validation, and utility functions needed for protein model fine-tuning and sequence generation.

## Installation and Setup

```javascript
import finetuningService from '../services/finetuningService';
import useAdvancedFinetuning from '../hooks/useAdvancedFinetuning';
```

## Service Methods

### Basic Endpoints

#### `getRoot()`
Get root API information.
```javascript
const info = await finetuningService.getRoot();
// Returns: { message: "Protein LLM Fine-tuning and Generation API" }
```

#### `getAvailableModels()`
Get list of available base models.
```javascript
const result = await finetuningService.getAvailableModels();
// Returns: { models: ["progen2-small", "progen2-medium", ...] }
```

#### `getHealth()`
Check server health status.
```javascript
const health = await finetuningService.getHealth();
// Returns: { status: "healthy", database: "connected", storage: "healthy", ... }
```

### Fine-tuning Operations

#### `startFinetuning(params)`
Start a fine-tuning job with comprehensive parameters.

**Parameters:**
```javascript
{
  model: "progen2-small",           // Required: Model name
  fastaFile: fileObject,            // Required: FASTA file
  output_dir: null,                 // Optional: Custom output directory
  use_lora: true,                   // Use LoRA fine-tuning
  use_optuna: true,                 // Use hyperparameter optimization
  n_trials: 5,                      // Number of Optuna trials
  learning_rate: 5e-5,              // Base learning rate
  per_device_train_batch_size: 4,   // Batch size
  num_train_epochs: 2,              // Training epochs
  weight_decay: 0.01,               // Weight decay
  // Optuna hyperparameter ranges
  optuna_lr_min: 1e-7,
  optuna_lr_max: 1e-6,
  optuna_batch_sizes: [4, 8],
  optuna_epochs_min: 1,
  optuna_epochs_max: 3,
  optuna_weight_decay_min: 0.0,
  optuna_weight_decay_max: 0.2
}
```

**Example:**
```javascript
const result = await finetuningService.startFinetuning({
  model: "progen2-small",
  fastaFile: selectedFile,
  use_optuna: true,
  n_trials: 3
});
// Returns: { job_id: "uuid", status: "pending", message: "..." }
```

### Sequence Generation

#### `generateSequence(params)`
Generate protein sequences using a fine-tuned model.

**Parameters:**
```javascript
{
  model_name: "progen2-small",      // Required: Base model name
  model_dir: "/path/to/model",      // Required: Path to fine-tuned model
  prompt: "MKTVRQERLKSIVR",         // Required: Input prompt
  max_new_tokens: 200,              // Max tokens to generate
  num_return_sequences: 1,          // Number of sequences
  temperature: 1.0,                 // Sampling temperature
  top_p: 0.9,                       // Top-p sampling
  top_k: 50                         // Top-k sampling
}
```

**Example:**
```javascript
const result = await finetuningService.generateSequence({
  model_name: "progen2-small",
  model_dir: "/workspace/volume1/jobs/job_abc123/final_model",
  prompt: "MKTVRQERLKSIVR",
  max_new_tokens: 100,
  num_return_sequences: 3
});
// Returns: { generation_id: "uuid", generated_sequences: [...], ... }
```

### Job Management

#### `getJobStatus(jobId)`
Get detailed status of a specific job.
```javascript
const status = await finetuningService.getJobStatus("job-uuid");
// Returns: { job_id, status, progress, message, result, error, ... }
```

#### `listJobs(params)`
List all jobs with optional filtering.
```javascript
const jobs = await finetuningService.listJobs({
  limit: 50,
  status: "completed"  // Optional filter
});
// Returns: { jobs: [...] }
```

#### `deleteJob(jobId)`
Delete a specific job.
```javascript
const result = await finetuningService.deleteJob("job-uuid");
// Returns: { message: "Job deleted successfully" }
```

#### `getJobTrainingLogs(jobId)`
Get detailed training logs for a job.
```javascript
const logs = await finetuningService.getJobTrainingLogs("job-uuid");
// Returns: { job_id, training_logs: [...] }
```

### Statistics and Monitoring

#### `getStatistics()`
Get comprehensive API usage statistics.
```javascript
const stats = await finetuningService.getStatistics();
// Returns: { job_statistics, total_generations, recent_jobs_24h, ... }
```

#### `getStorageInfo()`
Get storage organization and disk usage information.
```javascript
const storage = await finetuningService.getStorageInfo();
// Returns: { disk_usage, directory_info, storage_paths, ... }
```

#### `listJobDirectories()`
List all job directories and their contents.
```javascript
const directories = await finetuningService.listJobDirectories();
// Returns: { job_directories: [...] }
```

#### `cleanupJobFiles(jobId)`
Clean up all files associated with a job.
```javascript
const result = await finetuningService.cleanupJobFiles("job-uuid");
// Returns: { deleted_items, freed_space_mb, ... }
```

### Utility Methods

#### `isServerOnline()`
Check if the server is accessible.
```javascript
const online = await finetuningService.isServerOnline();
// Returns: boolean
```

#### `pollJobStatus(jobId, onProgress, interval)`
Poll job status until completion.
```javascript
const finalStatus = await finetuningService.pollJobStatus(
  "job-uuid",
  (status) => console.log(`Progress: ${status.progress}%`),
  5000  // Poll every 5 seconds
);
```

#### `getJobProgress(jobId)`
Get job status with detailed progress information.
```javascript
const progress = await finetuningService.getJobProgress("job-uuid");
// Returns: { ...status, training_logs, detailed_progress }
```

#### `validateFinetuningParams(params)`
Validate fine-tuning parameters before submission.
```javascript
const validation = finetuningService.validateFinetuningParams({
  model: "progen2-small",
  fastaFile: file
});
// Returns: { isValid: boolean, errors: [], warnings: [] }
```

#### `validateGenerationParams(params)`
Validate generation parameters.
```javascript
const validation = finetuningService.validateGenerationParams({
  model_name: "progen2-small",
  model_dir: "/path/to/model",
  prompt: "MKTV"
});
// Returns: { isValid: boolean, errors: [], warnings: [] }
```

## Advanced Hook Usage

The `useAdvancedFinetuning` hook provides a complete state management solution:

```javascript
const {
  // Data
  baseModels,
  userJobs,
  serverHealth,
  statistics,
  storageInfo,
  activeJobs,
  completedJobs,
  failedJobs,
  
  // State
  loading,
  initializing,
  error,
  connectionError,
  
  // Actions
  startFinetuning,
  generateSequence,
  deleteJob,
  cleanupJobFiles,
  refreshAll,
  
  // Utilities
  isServerOnline,
  clearError,
  hasActiveJobs
} = useAdvancedFinetuning();
```

### Hook Features

1. **Automatic Initialization**: Loads all data on mount
2. **Real-time Polling**: Automatically polls active jobs
3. **Error Handling**: Comprehensive error management
4. **Connection Monitoring**: Tracks server connection status
5. **State Synchronization**: Keeps all data in sync

## Error Handling

The service provides comprehensive error handling with detailed error information:

```javascript
try {
  await finetuningService.startFinetuning(params);
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    type: error.type,        // 'network', 'permission', 'validation', etc.
    context: error.context,  // Which operation failed
    details: error.details   // Raw error data
  });
}
```

### Error Types

- `network`: Connection/server issues
- `permission`: Authentication/authorization errors
- `validation`: Parameter validation failures
- `not_found`: Resource not found
- `file_size`: File size limit exceeded
- `quota`: Usage quota exceeded

## Utility Functions

### File Validation
```javascript
import { validateFastaFile } from '../utils/finetuningUtils';

const validation = validateFastaFile(file);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Progress Tracking
```javascript
import { getCurrentTrainingStage, formatProgress } from '../utils/finetuningUtils';

const stage = getCurrentTrainingStage(progress);
console.log(`Current stage: ${stage.name} - ${formatProgress(progress)}`);
```

### Job Status Formatting
```javascript
import { formatJobStatus, generateJobSummary } from '../utils/finetuningUtils';

const formattedStatus = formatJobStatus(job.status);
const jobSummary = generateJobSummary(job);
```

## Constants and Configuration

```javascript
import { 
  JOB_STATUS, 
  DEFAULT_FINETUNE_PARAMS, 
  DEFAULT_GENERATION_PARAMS,
  TRAINING_STAGES,
  ERROR_MESSAGES
} from '../utils/finetuningConstants';
```

## Examples

### Basic Fine-tuning
```javascript
// 1. Select file and validate
const handleFileSelect = (file) => {
  const validation = validateFastaFile(file);
  if (validation.isValid) {
    setSelectedFile(file);
  }
};

// 2. Start fine-tuning
const startTraining = async () => {
  try {
    const result = await startFinetuning({
      model: "progen2-small",
      fastaFile: selectedFile,
      use_optuna: true,
      n_trials: 5
    });
    console.log(`Job started: ${result.job_id}`);
  } catch (error) {
    console.error('Training failed:', error.message);
  }
};
```

### Real-time Progress Monitoring
```javascript
const [jobProgress, setJobProgress] = useState({});

useEffect(() => {
  const pollProgress = async () => {
    for (const jobId of activeJobs.map(job => job.job_id)) {
      try {
        const progress = await getJobProgress(jobId);
        setJobProgress(prev => ({ ...prev, [jobId]: progress }));
      } catch (error) {
        console.error(`Failed to get progress for ${jobId}:`, error);
      }
    }
  };

  const interval = setInterval(pollProgress, 5000);
  return () => clearInterval(interval);
}, [activeJobs]);
```

### Sequence Generation
```javascript
const generateProteinSequence = async (trainedModel, prompt) => {
  try {
    const result = await generateSequence({
      model_name: trainedModel.baseModel,
      model_dir: trainedModel.modelPath,
      prompt: prompt,
      max_new_tokens: 200,
      num_return_sequences: 3,
      temperature: 0.8
    });
    
    return result.generated_sequences;
  } catch (error) {
    throw new Error(`Generation failed: ${error.message}`);
  }
};
```

## Best Practices

1. **Always validate parameters** before API calls
2. **Handle errors gracefully** with user-friendly messages
3. **Use polling judiciously** to avoid overwhelming the server
4. **Clean up resources** when components unmount
5. **Cache results** when appropriate to reduce API calls
6. **Monitor connection status** and provide offline capabilities
7. **Validate files** before upload to prevent errors

## Component Integration

For easy integration with existing components, see:
- `FinetuningServiceExample.js` - Complete implementation example
- `CommonComponents.js` - Reusable UI components
- `useAdvancedFinetuning.js` - State management hook

This service provides everything needed for a complete protein fine-tuning application with robust error handling, real-time updates, and comprehensive monitoring capabilities.
