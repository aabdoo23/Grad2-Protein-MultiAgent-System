from typing import Dict, Any, List
from enum import Enum
import uuid

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Job:
    def __init__(self, title: str, description: str, function_name: str, parameters: Dict[str, Any]):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.status = JobStatus.PENDING
        self.function_name = function_name
        self.parameters = parameters
        self.result = None
        self.error = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "function_name": self.function_name,
            "parameters": self.parameters,
            "result": self.result,
            "error": self.error
        }

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self.job_queue: List[str] = []

    def create_job(self, title: str, description: str, function_name: str, parameters: Dict[str, Any]) -> Job:
        job = Job(title, description, function_name, parameters)
        self.jobs[job.id] = job
        return job

    def queue_job(self, job_id: str) -> bool:
        if job_id not in self.jobs:
            return False
        if job_id not in self.job_queue:
            self.job_queue.append(job_id)
        return True

    def get_job(self, job_id: str) -> Job:
        return self.jobs.get(job_id)

    def update_job_status(self, job_id: str, status: JobStatus, result: Any = None, error: str = None) -> bool:
        job = self.jobs.get(job_id)
        if not job:
            return False
        job.status = status
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
        return True

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        return [job.to_dict() for job in self.jobs.values()]

    def get_queued_jobs(self) -> List[Dict[str, Any]]:
        return [self.jobs[job_id].to_dict() for job_id in self.job_queue if job_id in self.jobs]