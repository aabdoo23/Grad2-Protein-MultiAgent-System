# api_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import runpod
import os
import json
import redis # <-- Add this import
from typing import Optional

# --- Your Project's Model Map ---
from api_config import MODEL_MAP 

# --- Configuration ---
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY")
FINETUNE_ENDPOINT_ID = os.environ.get("FINETUNE_ENDPOINT_ID")
# Add Redis config from environment variables
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

app = FastAPI()

# --- Initialize Clients ---
if not RUNPOD_API_KEY or not FINETUNE_ENDPOINT_ID:
    raise RuntimeError("RUNPOD_API_KEY and FINETUNE_ENDPOINT_ID must be set")
runpod.api_key = RUNPOD_API_KEY
worker_endpoint = runpod.Endpoint(FINETUNE_ENDPOINT_ID)

# Connect to Redis
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)


# --- API Models (Unchanged) ---
class FineTuneMode(str, Enum):
    QLORA = "qlora"
    FULL = "full"

class FineTuneRequest(BaseModel):
    model_key: str
    fasta_content: str
    finetune_mode: FineTuneMode = FineTuneMode.QLORA
    user_id: str
    n_trials: int = 5

class GenerateRequest(BaseModel):
    prompt: str
    base_model_key: Optional[str] = None
    model_dir_on_volume: Optional[str] = None
    user_id: str
    max_new_tokens: int = 200

class JobResponse(BaseModel):
    job_id: str
    status: str

# --- API Endpoints ---

@app.get("/models/base", summary="List Available Base Models")
async def list_base_models():
    return {"models": list(MODEL_MAP.keys())}

@app.get("/models/finetuned/{user_id}", summary="List User's Fine-Tuned Models")
async def list_finetuned_models(user_id: str):
    """
    Returns a list of completed models for a user by scanning the Redis database.
    """
    try:
        completed_models = []
        # In Redis, we'll store a set of job IDs for each user.
        user_job_ids = redis_client.smembers(f"user:{user_id}:jobs")
        
        if not user_job_ids:
            return {"user_id": user_id, "models": []}

        for job_id in user_job_ids:
            try:
                job_data_str = redis_client.get(f"job:{job_id}")
                if job_data_str:
                    job_data = json.loads(job_data_str)
                    if job_data.get("status") == "COMPLETED":
                        completed_models.append(job_data)
            except (json.JSONDecodeError, KeyError) as e:
                # Skip corrupted job data but continue processing
                continue

        return {"user_id": user_id, "models": completed_models}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user models: {str(e)}")

@app.post("/finetune", response_model=JobResponse, summary="Start a Fine-Tuning Job")
async def start_finetuning(request: FineTuneRequest):
    try:
        if request.model_key not in MODEL_MAP:
            raise HTTPException(status_code=400, detail=f"Invalid model_key '{request.model_key}'. Available models: {list(MODEL_MAP.keys())}")
        
        # Use our own internal UUID for the job for better tracking
        internal_job_id = str(uuid.uuid4())
            
        runpod_input = {
            "job_type": "full_pipeline",
            "job_id_internal": internal_job_id, # Pass our ID to the worker if needed for logging
            **request.dict()
        }
        
        runpod_job = worker_endpoint.run(runpod_input)
        
        # Store the initial job info in Redis
        job_info = {
            "internal_id": internal_job_id,
            "runpod_id": runpod_job.id,
            "user_id": request.user_id,
            "status": "PENDING",
            "request_data": request.dict() # Store the original request
        }
        redis_client.set(f"job:{runpod_job.id}", json.dumps(job_info))
        # Add this job to the user's set of jobs
        redis_client.sadd(f"user:{request.user_id}:jobs", runpod_job.id)

        # We return the RunPod job ID, as this is what we use to check status
        return {"job_id": runpod_job.id, "status": runpod_job.status}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start fine-tuning job: {str(e)}")

# Generate endpoint can be simpler and doesn't need as much tracking
@app.post("/generate", response_model=JobResponse, summary="Generate a Sequence")
async def start_generation(request: GenerateRequest):
    try:
        if not request.base_model_key and not request.model_dir_on_volume:
            raise HTTPException(status_code=400, detail="Must provide either base_model_key or model_dir_on_volume.")
        
        # Validate base_model_key if provided
        if request.base_model_key and request.base_model_key not in MODEL_MAP:
            raise HTTPException(status_code=400, detail=f"Invalid base_model_key '{request.base_model_key}'. Available models: {list(MODEL_MAP.keys())}")
        
        runpod_input = {"job_type": "generate", **request.dict()}
        runpod_job = worker_endpoint.run(runpod_input)
        return {"job_id": runpod_job.id, "status": runpod_job.status}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start generation job: {str(e)}")

@app.get("/status/{job_id}", summary="Get Job Status and Update DB")
async def get_job_status(job_id: str):
    """
    Checks the status and, if completed, saves the final result to our database.
    """
    try:
        # 1. Get live status from RunPod
        job_status = worker_endpoint.status(job_id)
        
        # 2. If the job is finished, update our persistent database (Redis)
        if job_status.status in ["COMPLETED", "FAILED"]:
            job_info_str = redis_client.get(f"job:{job_id}")
            if job_info_str:
                job_info = json.loads(job_info_str)
                # Avoid re-writing if we've already saved the final state
                if job_info.get("status") not in ["COMPLETED", "FAILED"]:
                    job_info["status"] = job_status.status
                    job_info["output"] = job_status.output
                    redis_client.set(f"job:{job_id}", json.dumps(job_info))

        # 3. Return the live status to the user
        return {
            "job_id": job_id,
            "status": job_status.status,
            "output": job_status.output
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

@app.delete("/models/finetuned/{user_id}/{job_id}", summary="Delete a Fine-Tuned Model")
async def delete_finetuned_model(user_id: str, job_id: str):
    """
    Delete a specific fine-tuned model for a user.
    """
    try:
        # Check if the job belongs to the user
        user_job_ids = redis_client.smembers(f"user:{user_id}:jobs")
        if job_id not in user_job_ids:
            raise HTTPException(status_code=404, detail="Model not found for this user")
        
        # Remove from user's job set
        redis_client.srem(f"user:{user_id}:jobs", job_id)
        # Remove the job data
        redis_client.delete(f"job:{job_id}")
        
        return {"success": True, "message": f"Model {job_id} deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")

@app.get("/jobs/user/{user_id}", summary="Get All Jobs for User")
async def get_user_jobs(user_id: str):
    """
    Get all jobs (completed, pending, failed) for a user.
    """
    try:
        user_jobs = []
        user_job_ids = redis_client.smembers(f"user:{user_id}:jobs")
        
        for job_id in user_job_ids:
            try:
                job_data_str = redis_client.get(f"job:{job_id}")
                if job_data_str:
                    job_data = json.loads(job_data_str)
                    user_jobs.append(job_data)
            except (json.JSONDecodeError, KeyError):
                continue
        
        return {"user_id": user_id, "jobs": user_jobs}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user jobs: {str(e)}")

# --- Health and Status Endpoints ---

@app.get("/health", summary="Health Check")
async def health_check():
    """Simple health check endpoint to verify server is running."""
    try:
        # Test Redis connection
        redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = f"disconnected: {str(e)}"
    
    return {
        "status": "healthy",
        "service": "Protein Fine-tuning API",
        "redis": redis_status,
        "runpod_configured": bool(RUNPOD_API_KEY and FINETUNE_ENDPOINT_ID),
        "available_models": len(MODEL_MAP)
    }

@app.get("/", summary="API Information")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Protein Fine-tuning API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "models": {
                "base": "/models/base",
                "finetuned": "/models/finetuned/{user_id}"
            },
            "jobs": {
                "finetune": "/finetune",
                "generate": "/generate",
                "status": "/status/{job_id}"
            }
        }
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for better error responses."""
    return {
        "error": "Internal server error",
        "detail": str(exc),
        "type": type(exc).__name__
    }