from typing import Dict, Any, List, Optional
from enum import Enum
import uuid

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
class Job:
    def __init__(self, title: str, description: str, function_name: str, parameters: Dict[str, Any], job_id: str = None):
        self.id = job_id if job_id else str(uuid.uuid4())
        self.title = title
        self.description = description
        self.function_name = function_name
        self.parameters = parameters
        self.status = JobStatus.PENDING
        self.result = None
        self.error = None
        self.progress = 0
        self.depends_on = None
        self.block_id = None  # Added for Sandbox integration

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "function_name": self.function_name,
            "parameters": self.parameters,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "progress": self.progress,
            "depends_on": self.depends_on,
            "block_id": self.block_id
        }

class JobManager:
    def __init__(self):
        self.jobs = {}
        self.job_queue = []
        self.pending_confirmations = []

    def create_job(self, job_id: str = None, function_name: str = None, parameters: Dict[str, Any] = None, 
                  description: str = None, title: str = None) -> Job:
        """Create a new job with optional custom ID."""
        parameters = parameters or {}
        
        if not title:
            title = f"Job {function_name}" if function_name else f"Job {job_id}"
            
        if not description:
            description = "Sandbox job"
        
        job = Job(title, description, function_name, parameters, job_id)
        self.jobs[job.id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        print(f"Getting job {job_id}")
        job = self.jobs.get(job_id)
        print(f"Job: {job}")
        return job

    def queue_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False
            
        # Check if this job depends on another
        if job.depends_on:
            dependent_job = self.get_job(job.depends_on)
            # Only queue if dependent job is completed
            if not dependent_job or dependent_job.status != JobStatus.COMPLETED:
                return False
                
        if job_id not in self.job_queue:
            self.job_queue.append(job_id)
        return True

    def update_job_status(self, job_id: str, status: JobStatus, result: Dict[str, Any] = None, error: str = None) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False
            
        job.status = status
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
            
        # If job completed successfully, queue any dependent jobs
        if status == JobStatus.COMPLETED:
            self._queue_dependent_jobs(job_id)
            
        return True

    def _queue_dependent_jobs(self, completed_job_id: str) -> None:
        """Queue any jobs that depend on the completed job."""
        for job in self.jobs.values():
            if job.depends_on == completed_job_id:
                self.queue_job(job.id)

    def get_next_job(self) -> Optional[Job]:
        while self.job_queue:
            job_id = self.job_queue[0]
            job = self.get_job(job_id)
            if not job:
                self.job_queue.pop(0)
                continue
                
            # Check if dependent job is completed
            if job.depends_on:
                dependent_job = self.get_job(job.depends_on)
                if not dependent_job or dependent_job.status != JobStatus.COMPLETED:
                    self.job_queue.pop(0)
                    continue
                    
            return job
        return None

    def remove_job_from_queue(self, job_id: str) -> None:
        if job_id in self.job_queue:
            self.job_queue.remove(job_id)

    def get_all_jobs(self) -> Dict[str, Dict[str, Any]]:
        return {job_id: job.to_dict() for job_id, job in self.jobs.items()}