import requests
import time
from typing import Dict, List, Optional, Any
from finetune_config import (
    FINETUNE_SERVER_URL, TIMEOUT_SHORT, TIMEOUT_MEDIUM, TIMEOUT_LONG,
    MAX_RETRIES, RETRY_DELAY, DEFAULT_FINETUNE_MODE, DEFAULT_N_TRIALS,
    DEFAULT_MAX_NEW_TOKENS, VALID_FINETUNE_MODES, JOB_STATUS_MAPPING
)


class FinetuneAPIClient:
    """Client for interacting with the fine-tuning server API."""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or FINETUNE_SERVER_URL
        self.session = requests.Session()
        
    def _make_request(self, method: str, endpoint: str, timeout: int = TIMEOUT_MEDIUM, 
                     json_data: Dict = None, params: Dict = None) -> Dict:
        """Make a request to the fine-tuning server with error handling and retries."""
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=json_data,
                    params=params,
                    timeout=timeout
                )
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                if attempt == MAX_RETRIES - 1:  # Last attempt
                    raise
                time.sleep(RETRY_DELAY * (attempt + 1))  # Exponential backoff
                
    def health_check(self) -> Dict:
        """Check if the fine-tuning server is healthy."""
        return self._make_request("GET", "/health", timeout=TIMEOUT_SHORT)
    
    def get_base_models(self) -> Dict:
        """Get list of available base models."""
        return self._make_request("GET", "/models/base")
    
    def get_user_models(self, user_id: str) -> Dict:
        """Get list of user's fine-tuned models."""
        return self._make_request("GET", f"/models/finetuned/{user_id}")
    
    def get_user_jobs(self, user_id: str) -> Dict:
        """Get all jobs for a user."""
        return self._make_request("GET", f"/jobs/user/{user_id}")
    
    def start_finetuning(self, model_key: str, fasta_content: str, user_id: str,
                        finetune_mode: str = None, n_trials: int = None) -> Dict:
        """Start a fine-tuning job."""
        if finetune_mode and finetune_mode not in VALID_FINETUNE_MODES:
            raise ValueError(f"Invalid finetune_mode. Must be one of: {VALID_FINETUNE_MODES}")
            
        data = {
            "model_key": model_key,
            "fasta_content": fasta_content,
            "user_id": user_id,
            "finetune_mode": finetune_mode or DEFAULT_FINETUNE_MODE,
            "n_trials": n_trials or DEFAULT_N_TRIALS
        }
        
        return self._make_request("POST", "/finetune", json_data=data, timeout=TIMEOUT_LONG)
    
    def generate_sequence(self, prompt: str, user_id: str, base_model_key: str = None,
                         model_dir_on_volume: str = None, max_new_tokens: int = None) -> Dict:
        """Generate a protein sequence."""
        if not base_model_key and not model_dir_on_volume:
            raise ValueError("Must provide either base_model_key or model_dir_on_volume")
            
        data = {
            "prompt": prompt,
            "user_id": user_id,
            "max_new_tokens": max_new_tokens or DEFAULT_MAX_NEW_TOKENS
        }
        
        if base_model_key:
            data["base_model_key"] = base_model_key
        if model_dir_on_volume:
            data["model_dir_on_volume"] = model_dir_on_volume
            
        return self._make_request("POST", "/generate", json_data=data, timeout=TIMEOUT_LONG)
    
    def get_job_status(self, job_id: str) -> Dict:
        """Get the status of a job."""
        return self._make_request("GET", f"/status/{job_id}")
    
    def delete_model(self, user_id: str, job_id: str) -> Dict:
        """Delete a user's fine-tuned model."""
        return self._make_request("DELETE", f"/models/finetuned/{user_id}/{job_id}")
    
    def is_server_available(self) -> bool:
        """Check if the server is available."""
        try:
            self.health_check()
            return True
        except:
            return False
    
    def normalize_job_status(self, status: str) -> str:
        """Normalize job status to consistent format."""
        return JOB_STATUS_MAPPING.get(status.upper(), status.lower())


# Global instance
finetune_client = FinetuneAPIClient()
