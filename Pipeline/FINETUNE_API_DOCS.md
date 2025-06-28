# Fine-tuning API Documentation

This document describes the fine-tuning endpoints added to the Protein Pipeline application.

## Overview

The fine-tuning functionality allows users to fine-tune protein language models and generate new protein sequences. The system consists of:

1. **Flask App (Frontend API)**: Provides REST endpoints for the web interface
2. **FastAPI Server (Backend)**: Handles the actual fine-tuning using RunPod
3. **Redis Database**: Stores job information and user data

## Configuration

Set the following environment variable:
```bash
export FINETUNE_SERVER_URL="http://your-finetune-server:8000"
```

## Flask Endpoints

### Health Check
- **GET** `/api/finetune/health`
- Check if the fine-tuning server is available

### Base Models
- **GET** `/api/finetune/models/base`
- Get list of available base models for fine-tuning

### User Models
- **GET** `/api/finetune/models/user/{user_id}`
- Get list of user's completed fine-tuned models

### User Jobs
- **GET** `/api/finetune/jobs/user/{user_id}`
- Get all jobs (all statuses) for a user

### Start Fine-tuning
- **POST** `/api/finetune/start`
- Start a new fine-tuning job

**Request Body:**
```json
{
    "model_key": "protgpt2",
    "fasta_content": ">seq1\nMKVLI...",
    "user_id": "user123",
    "finetune_mode": "qlora",  // optional: "qlora" or "full"
    "n_trials": 5              // optional: number of trials
}
```

### Generate Sequence
- **POST** `/api/finetune/generate`
- Generate a protein sequence using a base or fine-tuned model

**Request Body:**
```json
{
    "prompt": "<|startoftext|>",
    "user_id": "user123",
    "base_model_key": "protgpt2",     // use base model
    // OR
    "model_dir_on_volume": "path/to/finetuned/model",  // use fine-tuned model
    "max_new_tokens": 200             // optional
}
```

### Job Status
- **GET** `/api/finetune/status/{job_id}`
- Get status and results of a job

### Delete Model
- **DELETE** `/api/finetune/models/user/{user_id}/{job_id}`
- Delete a specific fine-tuned model

## Response Format

All endpoints return JSON responses with the following structure:

### Success Response
```json
{
    "success": true,
    "data": { ... }
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error message"
}
```

## Job Statuses

- `pending`: Job is queued
- `running`: Job is being executed
- `completed`: Job finished successfully
- `failed`: Job failed with error
- `cancelled`: Job was cancelled

## Usage Examples

### Starting a Fine-tuning Job
```bash
curl -X POST http://localhost:5000/api/finetune/start \
  -H "Content-Type: application/json" \
  -d '{
    "model_key": "protgpt2",
    "fasta_content": ">protein1\nMKVLIVLLFGAVLIQKTSR\n>protein2\nMQIFVKTLTGKTITLEVEPS",
    "user_id": "user123"
  }'
```

### Checking Job Status
```bash
curl http://localhost:5000/api/finetune/status/job_12345
```

### Generating a Sequence
```bash
curl -X POST http://localhost:5000/api/finetune/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<|startoftext|>",
    "user_id": "user123",
    "base_model_key": "protgpt2",
    "max_new_tokens": 100
  }'
```

## Error Handling

The system includes comprehensive error handling:

- Connection timeouts and retries
- Validation of required fields
- Server availability checks
- Graceful degradation when the fine-tuning server is unavailable

## Integration with Frontend

These endpoints are designed to be called from the React frontend components. The responses include all necessary information for updating the UI state and displaying progress to users.
