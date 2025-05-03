#!/usr/bin/env python3
import os
import requests
import time
import json
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any
from .base_predictor import BaseStructurePredictor

load_dotenv()

class AlphaFold2_Predictor(BaseStructurePredictor):
    def __init__(self):
        super().__init__()
        self.key = os.getenv("NVCF_RUN_KEY")
        self.url = "https://health.api.nvidia.com/v1/biology/deepmind/alphafold2"
        self.status_url = "https://health.api.nvidia.com/v1/status"
        self.headers = {
            "content-type": "application/json",
            "Authorization": f"Bearer {self.key}",
            "NVCF-POLL-SECONDS": "600",
        }

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        if not self.validate_sequence(sequence):
            return {"success": False, "error": "Invalid protein sequence."}
            
        try:
            data = {
                "sequence": sequence,
                "algorithm": "mmseqs2",
                "e_value": 0.0001,
                "iterations": 1,
                "databases": ["small_bfd"],
                "relax_prediction": False,
                "skip_template_search": True
            }

            print("Making AlphaFold2 request...")
            try:
                response = requests.post(
                    self.url, 
                    headers=self.headers, 
                    json=data,
                    timeout=600
                )
            except requests.exceptions.Timeout:
                return {"success": False, "error": "AlphaFold2 API request timed out during submission. The server might be busy."}
            except requests.exceptions.ConnectionError:
                return {"success": False, "error": "Connection error with AlphaFold2 API. Please check your network connection."}

            if response.status_code == 200:
                try:
                    result = response.json()
                    # print("Received immediate response:", result)
                    if isinstance(result, list) and len(result) > 0:
                        structure = result[0]
                        pdb_file = self.save_structure(structure)
                        metrics = self.calculate_metrics(structure)
                        return {"success": True, "structure": structure, "pdb_file": pdb_file, "metrics": metrics}
                    else:
                        return {"success": False, "error": "No PDB structure in AlphaFold2 response"}
                except json.JSONDecodeError as e:
                    return {"success": False, "error": f"Invalid JSON response from AlphaFold2 API: {str(e)}"}
                    
            elif response.status_code == 202:
                print("AlphaFold2 request accepted, waiting for async processing...")
                req_id = response.headers.get("nvcf-reqid")
                if not req_id:
                    return {"success": False, "error": "No request ID received from AlphaFold2 API"}

                max_attempts = 30
                polling_interval = 20
                attempts = 0
                
                while attempts < max_attempts:
                    attempts += 1
                    print(f"Polling AlphaFold2 for results (attempt {attempts}/{max_attempts})...")
                    
                    try:
                        status_response = requests.get(
                            f"{self.status_url}/{req_id}", 
                            headers=self.headers,
                            timeout=120
                        )
                    except requests.exceptions.Timeout:
                        print(f"Status check timed out, retrying in {polling_interval} seconds...")
                        time.sleep(polling_interval)
                        continue
                    except requests.exceptions.ConnectionError as e:
                        print(f"Connection error during polling: {str(e)}")
                        time.sleep(polling_interval)
                        continue

                    if status_response.status_code != 202:
                        try:
                            result = status_response.json()
                            print(f"Received status response: {result}")
                            if isinstance(result, list) and len(result) > 0:
                                structure = result[0]
                                pdb_file = self.save_structure(structure)
                                metrics = self.calculate_metrics(structure)
                                return {"success": True, "structure": structure, "pdb_file": pdb_file, "metrics": metrics}
                            else:
                                return {"success": False, "error": "No PDB structure in AlphaFold2 response"}
                        except json.JSONDecodeError as e:
                            return {"success": False, "error": f"Invalid JSON response from AlphaFold2 API: {str(e)}"}
                    
                    time.sleep(polling_interval)
                
                return {"success": False, "error": "AlphaFold2 prediction timed out after maximum polling attempts"}
            else:
                error_msg = f"Unexpected HTTP status: {response.status_code}"
                try:
                    error_data = response.json()
                    if isinstance(error_data, dict) and "error" in error_data:
                        error_msg += f" - {error_data['error']}"
                except:
                    error_msg += f" - {response.text}"
                
                print(f"AlphaFold2 API error: {error_msg}")
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            print(f"Unexpected error in AlphaFold2 predictor: {str(e)}")
            return {"success": False, "error": str(e)}
