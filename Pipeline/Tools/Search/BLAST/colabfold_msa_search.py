import asyncio
import json
from typing import Dict, Any, Optional
from fastapi import HTTPException
import httpx
import os
from pathlib import Path
import logging
from .phylogenetic_analyzer import PhylogeneticAnalyzer

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATUS_URL = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/status/{task_id}"
PUBLIC_URL = "https://health.api.nvidia.com/v1/biology/colabfold/msa-search/predict"

class ColabFold_MSA_Searcher:
    def __init__(self):
        self.phylogenetic_analyzer = PhylogeneticAnalyzer(email="aabdoo2304@gmail.com")
        self.default_database = "Uniref30_2302"
        self.default_e_value = 0.0001
        self.default_iterations = 1

    def _acquire_key(self) -> str:
        """Acquire the NVCF Run Key from the environment."""
        if os.environ.get("NVCF_RUN_KEY", None) is None:
            raise Exception("Error: Must set NVCF_RUN_KEY environment variable.")
        return os.environ.get("NVCF_RUN_KEY")

    async def _make_nvcf_call(self, 
                            data: Dict[str, Any],
                            additional_headers: Optional[Dict[str, Any]] = None,
                            NVCF_POLL_SECONDS: int = 10,
                            MANUAL_TIMEOUT_SECONDS: int = 20) -> Dict:
        """Make a call to NVIDIA Cloud Functions using long-polling."""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self._acquire_key()}",
                "NVCF-POLL-SECONDS": f"{NVCF_POLL_SECONDS}",
                "Content-Type": "application/json"
            }
            if additional_headers is not None:
                headers.update(additional_headers)
            
            logger.debug(f"Making NVCF call to {PUBLIC_URL}")
            logger.debug(f"Data: {data}")
            
            response = await client.post(PUBLIC_URL,
                                     json=data,
                                     headers=headers,
                                     timeout=MANUAL_TIMEOUT_SECONDS)
            logger.debug(f"NVCF response: {response.status_code, response.headers}")

            if response.status_code == 202:
                # Handle 202 Accepted response
                task_id = response.headers.get("nvcf-reqid")
                while True:
                    status_response = await client.get(STATUS_URL.format(task_id=task_id),
                                                   headers=headers,
                                                   timeout=MANUAL_TIMEOUT_SECONDS)
                    if status_response.status_code == 200:
                        return status_response.status_code, status_response
                    elif status_response.status_code in [400, 401, 404, 422, 500]:
                        raise HTTPException(status_response.status_code,
                                            "Error while waiting for function:\n",
                                            response.text)
            elif response.status_code == 200:
                return response.status_code, response
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)

    def search(self, sequence: str) -> Dict[str, Any]:
        """Submit a ColabFold MSA search and return the results.
        
        Args:
            sequence (str): The protein sequence to search
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if submission was successful
                - results: Search results if successful
                - error: Error message if unsuccessful
        """
        try:
            # Initial request
            data = {
                "sequence": sequence,
                "e_value": self.default_e_value,
                "iterations": self.default_iterations,
                "databases": [self.default_database],
                "output_alignment_formats": ["fasta"]
            }

            # Run the async function
            code, response = asyncio.run(self._make_nvcf_call(data=data))
            
            if code == 200:
                response_dict = response.json()
                
                # Process the results
                processed_results = {
                    "success": True,
                    "results": {
                        "alignments": response_dict.get("alignments", {}),
                        "templates": response_dict.get("templates", {}),
                        "metrics": response_dict.get("metrics", {})
                    }
                }
                
                # Generate phylogenetic tree if alignments are available
                if self.default_database in response_dict.get("alignments", {}):
                    alignment = response_dict["alignments"][self.default_database]["fasta"]["alignment"]
                    tree_file = self.phylogenetic_analyzer.create_phylogenetic_tree_from_alignment(alignment)
                    if tree_file:
                        processed_results["results"]["phylogenetic_tree"] = tree_file
                
                return processed_results
            else:
                return {"success": False, "error": f"Request failed with status code {code}"}
                
        except Exception as e:
            logger.error(f"Error during ColabFold MSA search: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_results(self, rid: str) -> Dict[str, Any]:
        """Check the status and get results of a ColabFold MSA search.
        
        Args:
            rid (str): The Request ID
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if check was successful
                - status: Current status ('running', 'completed', 'failed')
                - results: Processed results if completed
                - error: Error message if unsuccessful
        """
        try:
            # For ColabFold MSA, we don't need to check status as results are returned immediately
            return {
                "success": False,
                "status": "failed",
                "error": "ColabFold MSA search returns results immediately, no need to check status"
            }
        except Exception as e:
            logger.error(f"Error checking ColabFold MSA results: {str(e)}")
            return {
                "success": False,
                "status": "failed",
                "error": str(e)
            }
