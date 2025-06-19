import asyncio
import json
from typing import Dict, Any, Optional
from fastapi import HTTPException
import httpx
import os
import logging
try:
    from .schema_normalizer import MSASchemaNormalizer
except ImportError:
    # Handle case when module is run directly or in tests
    from schema_normalizer import MSASchemaNormalizer

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATUS_URL = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/status/{task_id}"
PUBLIC_URL = "https://health.api.nvidia.com/v1/biology/colabfold/msa-search/predict"

class ColabFold_MSA_Searcher:
    def __init__(self):
        self.default_database = "Uniref30_2302"
        self.default_e_value = 0.0001
        self.default_iterations = 1
        self.schema_normalizer = MSASchemaNormalizer()

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

    def search(self, sequence: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        if not sequence:
            return {"success": False, "error": "No sequence provided"}
            
        try:
            # Use parameters from the job if provided, otherwise use defaults
            e_value = parameters.get("e_value", 0.0001) if parameters else 0.0001
            iterations = parameters.get("iterations", 1) if parameters else 1
            databases = parameters.get("databases", ["Uniref30_2302"]) if parameters else ["Uniref30_2302"]
            output_alignment_formats = parameters.get("output_alignment_formats", ["fasta"]) if parameters else ["fasta"]
            sequence = sequence.replace(" ", "")
            # Prepare the MSA search parameters
            msa_params = {
                "sequence": sequence,
                "e_value": e_value,
                "iterations": iterations,
                "databases": databases,               
                "output_alignment_formats": output_alignment_formats
            }
            code, response = asyncio.run(self._make_nvcf_call(data=msa_params))
            if code == 200:
                try:
                    results = response.json()
                    # Normalize results using the schema normalizer
                    normalized_results = self.schema_normalizer.normalize_colabfold_results(results, sequence, e_value)
                    return {"success": True, "results": normalized_results}
                except json.JSONDecodeError:
                    return {"success": False, "error": "Failed to parse MSA results"}
            else:
                return {"success": False, "error": f"Failed to submit MSA search: HTTP {code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

