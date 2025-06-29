# Mock/Development version of the finetuning API
# This version can run locally without Redis or RunPod for initial testing

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import os
import json
import time
from typing import Dict, Any, Optional, Union
from pathlib import Path

# Import from our config
from api_config import MODEL_MAP 

# Configuration - check if we're in development mode
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "true").lower() == "true"
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
FINETUNE_ENDPOINT_ID = os.getenv("FINETUNE_ENDPOINT_ID")

app = FastAPI(
    title="Protein Fine-tuning API",
    description="API for fine-tuning protein language models",
    version="1.0.0"
)

# In-memory storage for development (replace with Redis in production)
job_storage: Dict[str, Any] = {}
user_jobs: Dict[str, set] = {}

# --- API Models ---
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

# --- Helper Functions ---
def save_job_data(job_id: str, data: Dict[str, Any]):
    """Save job data to storage (in-memory for development)"""
    if DEVELOPMENT_MODE:
        job_storage[job_id] = data
    # In production, this would save to Redis

def get_job_data(job_id: str) -> Optional[Dict[str, Any]]:
    """Get job data from storage"""
    if DEVELOPMENT_MODE:
        return job_storage.get(job_id)
    # In production, this would get from Redis

def add_user_job(user_id: str, job_id: str):
    """Add job to user's job list"""
    if DEVELOPMENT_MODE:
        if user_id not in user_jobs:
            user_jobs[user_id] = set()
        user_jobs[user_id].add(job_id)
    # In production, this would use Redis sets

def get_user_jobs(user_id: str) -> set:
    """Get all job IDs for a user"""
    if DEVELOPMENT_MODE:
        return user_jobs.get(user_id, set())
    # In production, this would get from Redis
    return set()

def remove_user_job(user_id: str, job_id: str):
    """Remove job from user's job list"""
    if DEVELOPMENT_MODE:
        if user_id in user_jobs:
            user_jobs[user_id].discard(job_id)
    # In production, this would use Redis

def simulate_job_progress(job_id: str):
    """Simulate job progress for development mode"""
    if not DEVELOPMENT_MODE:
        return
    
    # This would normally be handled by the actual RunPod worker
    # For development, we'll simulate different stages
    job_data = get_job_data(job_id)
    if not job_data:
        return
    
    # Simulate job completion after some time
    import threading
    import time
    
    def complete_job():
        time.sleep(5)  # Simulate 5 seconds of processing
        job_data = get_job_data(job_id)
        if job_data and job_data.get("status") == "IN_PROGRESS":
            job_data["status"] = "COMPLETED"
            job_data["output"] = {
                "model_path": f"/path/to/finetuned/model/{job_id}",
                "training_logs": "Training completed successfully",
                "metrics": {
                    "final_loss": 0.234,
                    "epochs": 3,
                    "training_time": "5 minutes"
                }
            }
            save_job_data(job_id, job_data)
    
    thread = threading.Thread(target=complete_job)
    thread.daemon = True
    thread.start()

# --- API Endpoints ---

@app.get("/models/base", summary="List Available Base Models")
async def list_base_models():
    """List all available base models for fine-tuning"""
    return {"models": list(MODEL_MAP.keys())}

@app.get("/models/finetuned/{user_id}", summary="List User's Fine-Tuned Models")
async def list_finetuned_models(user_id: str):
    """
    Returns a list of completed models for a user.
    """
    try:
        completed_models = []
        user_job_ids = get_user_jobs(user_id)
        
        if not user_job_ids:
            return {"user_id": user_id, "models": []}

        for job_id in user_job_ids:
            job_data = get_job_data(job_id)
            if job_data and job_data.get("status") == "COMPLETED":
                completed_models.append(job_data)

        return {"user_id": user_id, "models": completed_models}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user models: {str(e)}")

@app.post("/finetune", response_model=JobResponse, summary="Start a Fine-Tuning Job")
async def start_finetuning(request: FineTuneRequest):
    """Start a new fine-tuning job"""
    try:
        if request.model_key not in MODEL_MAP:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid model_key '{request.model_key}'. Available models: {list(MODEL_MAP.keys())}"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Prepare job data
        job_info = {
            "job_id": job_id,
            "user_id": request.user_id,
            "status": "IN_PROGRESS" if DEVELOPMENT_MODE else "PENDING",
            "request_data": request.dict(),
            "created_at": time.time(),
            "model_key": request.model_key,
            "finetune_mode": request.finetune_mode
        }
        
        if DEVELOPMENT_MODE:
            # In development mode, simulate the job
            save_job_data(job_id, job_info)
            add_user_job(request.user_id, job_id)
            simulate_job_progress(job_id)
            status = "IN_PROGRESS"
        else:
            # In production, submit to RunPod
            if not RUNPOD_API_KEY or not FINETUNE_ENDPOINT_ID:
                raise HTTPException(
                    status_code=500, 
                    detail="RunPod configuration missing. Set RUNPOD_API_KEY and FINETUNE_ENDPOINT_ID"
                )
            
            # Here you would submit to RunPod
            # For now, just save the job info
            save_job_data(job_id, job_info)
            add_user_job(request.user_id, job_id)
            status = "PENDING"

        return {"job_id": job_id, "status": status}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start fine-tuning job: {str(e)}")

@app.post("/generate", response_model=JobResponse, summary="Generate a Sequence")
async def start_generation(request: GenerateRequest):
    """Start a sequence generation job"""
    try:
        if not request.base_model_key and not request.model_dir_on_volume:
            raise HTTPException(
                status_code=400, 
                detail="Must provide either base_model_key or model_dir_on_volume."
            )
        
        # Validate base_model_key if provided
        if request.base_model_key and request.base_model_key not in MODEL_MAP:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid base_model_key '{request.base_model_key}'. Available models: {list(MODEL_MAP.keys())}"
            )
        
        # Check if model_dir_on_volume refers to a fine-tuned model
        model_info = None
        if request.model_dir_on_volume and request.model_dir_on_volume.startswith("/finetuned_models/"):
            # Extract job ID from the path
            job_id = request.model_dir_on_volume.replace("/finetuned_models/", "")
            job_data = get_job_data(job_id)
            
            if not job_data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Fine-tuned model with job ID '{job_id}' not found"
                )
            
            if job_data.get("status") != "COMPLETED":
                raise HTTPException(
                    status_code=400,
                    detail=f"Fine-tuned model with job ID '{job_id}' is not ready (status: {job_data.get('status')})"
                )
            
            # Check if the model belongs to the requesting user
            if job_data.get("user_id") != request.user_id:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have access to this fine-tuned model"
                )
            
            model_info = {
                "type": "finetuned",
                "job_id": job_id,
                "base_model": job_data.get("model_key"),
                "finetune_mode": job_data.get("finetune_mode")
            }
        
        job_id = str(uuid.uuid4())
        
        if DEVELOPMENT_MODE:
            # Simulate generation job with enhanced output for fine-tuned models
            output = {
                "generated_sequence": "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG",
                "confidence": 0.87,
                "generation_time": "2 seconds"
            }
            
            if model_info:
                output.update({
                    "model_used": f"Fine-tuned {model_info['base_model']} ({model_info['finetune_mode']})",
                    "source_job_id": model_info["job_id"],
                    "confidence": 0.92  # Higher confidence for fine-tuned models
                })
            else:
                output["model_used"] = request.base_model_key or "Custom model"
            
            job_info = {
                "job_id": job_id,
                "user_id": request.user_id,
                "status": "COMPLETED",
                "request_data": request.dict(),
                "output": output,
                "model_info": model_info
            }
            save_job_data(job_id, job_info)
            status = "COMPLETED"
        else:
            # In production, submit to RunPod
            job_info = {
                "job_id": job_id,
                "user_id": request.user_id,
                "status": "PENDING",
                "request_data": request.dict(),
                "model_info": model_info
            }
            save_job_data(job_id, job_info)
            status = "PENDING"
        
        return {"job_id": job_id, "status": status}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start generation job: {str(e)}")

@app.get("/status/{job_id}", summary="Get Job Status")
async def get_job_status(job_id: str):
    """Get the current status of a job"""
    try:
        job_data = get_job_data(job_id)
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            "status": job_data.get("status", "UNKNOWN"),
            "output": job_data.get("output"),
            "created_at": job_data.get("created_at"),
            "request_data": job_data.get("request_data")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

@app.delete("/models/finetuned/{user_id}/{job_id}", summary="Delete a Fine-Tuned Model")
async def delete_finetuned_model(user_id: str, job_id: str):
    """Delete a specific fine-tuned model for a user"""
    try:
        user_job_ids = get_user_jobs(user_id)
        if job_id not in user_job_ids:
            raise HTTPException(status_code=404, detail="Model not found for this user")
        
        remove_user_job(user_id, job_id)
        if DEVELOPMENT_MODE:
            job_storage.pop(job_id, None)
        
        return {"success": True, "message": f"Model {job_id} deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")

@app.get("/jobs/user/{user_id}", summary="Get All Jobs for User")
async def get_user_jobs_endpoint(user_id: str):
    """Get all jobs (completed, pending, failed) for a user"""
    try:
        user_job_list = []
        user_job_ids = get_user_jobs(user_id)
        
        for job_id in user_job_ids:
            job_data = get_job_data(job_id)
            if job_data:
                user_job_list.append(job_data)
        
        return {"user_id": user_id, "jobs": user_job_list}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user jobs: {str(e)}")

# --- Health and Status Endpoints ---

@app.get("/health", summary="Health Check")
async def health_check():
    """Health check endpoint to verify server is running"""
    health_status = {
        "status": "healthy",
        "service": "Protein Fine-tuning API",
        "mode": "development" if DEVELOPMENT_MODE else "production",
        "runpod_configured": bool(RUNPOD_API_KEY and FINETUNE_ENDPOINT_ID),
        "available_models": len(MODEL_MAP)
    }
    
    if DEVELOPMENT_MODE:
        health_status["storage"] = "in-memory"
        health_status["jobs_in_storage"] = len(job_storage)
    else:
        # In production, check Redis connection
        health_status["storage"] = "redis"
    
    return health_status

@app.get("/", summary="API Information")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Protein Fine-tuning API",
        "version": "1.0.0",
        "mode": "development" if DEVELOPMENT_MODE else "production",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc",
            "models": {
                "base": "/models/base",
                "finetuned": "/models/finetuned/{user_id}"
            },
            "jobs": {
                "finetune": "/finetune",
                "generate": "/generate",
                "status": "/status/{job_id}",
                "user_jobs": "/jobs/user/{user_id}"
            }
        }
    }

@app.get("/debug/storage", summary="Debug: View Storage Contents")
async def debug_storage():
    """Debug endpoint to view current storage contents (development only)"""
    if not DEVELOPMENT_MODE:
        raise HTTPException(status_code=404, detail="Debug endpoints only available in development mode")
    
    return {
        "job_storage": job_storage,
        "user_jobs": {k: list(v) for k, v in user_jobs.items()}
    }
