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

    #e_value [float]
    #Defaults to 0.0001
    #The e-value used for filtering hits when building the Multiple Sequence Alignment.
    
    #databases [list]   
    #Defaults to uniref90,mgnify,small_bfd
    #Databases used for Multiple Sequence Alignment. By default, uniref90, mgnify, and small_bfd are used.Choice of databases(s) can significantly impact downstream structure prediction, so we recommend modifying carefully.
    databases = ["uniref90", "mgnify", "small_bfd"]
    
    #algorithm The algorithm to use for MSA. AlphaFold2 was trained on JackHMMer; MMSeqs2 provides faster inference.
    algorithms = ["mmseqs2", "jackhmmer"]
    
    #iterations [int]
    #Defaults to 1
    #The number of MSA iterations to perform.
    
    #relax_prediction [true, false]
    #Defaults to true
    #Run structural relaxation after prediction
    
    #structure_model_preset [monomer, multimer]
    #Defaults to monomer
    #The AlphaFold2 structural prediction model to use for inference.
    
    #structure_models_to_relax
    #Defaults to all
    #Which structural prediction to relax with AMBER. Default: relax all models
    
    #num_predictions_per_model [int]
    #Defaults to 1
    #Determines the number of times the trunk of the network is run with different random MSA cluster centers.

    #max_msa_sequences 
    #The maximum sequences taken from the MSA for model prediction.
    
    #template_searcher [hhsearch, hmmsearch]
    #Defaults to hhsearch
    #The template searcher to use for templating. hmmsearch should be used for multimer; most other queries should rely on hhsearch.
    
    def predict_structure(self, sequence: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        if not self.validate_sequence(sequence):
            return {"success": False, "error": "Invalid protein sequence."}
            
        try:
            # Use parameters from the job if provided, otherwise use defaults
            data = {
                "sequence": sequence,
                "algorithm": parameters.get("algorithm", "mmseqs2") if parameters else "mmseqs2",
                "e_value": parameters.get("e_value", 0.0001) if parameters else 0.0001,
                "iterations": parameters.get("iterations", 1) if parameters else 1,
                "databases": parameters.get("databases", ["small_bfd"]) if parameters else ["small_bfd"],
                "relax_prediction": parameters.get("relax_prediction", False) if parameters else False,
                "structure_model_preset": parameters.get("structure_model_preset", "monomer") if parameters else "monomer",
                "structure_models_to_relax": parameters.get("structure_models_to_relax", "all") if parameters else "all",
                "num_predictions_per_model": parameters.get("num_predictions_per_model", 1) if parameters else 1,
                "max_msa_sequences": parameters.get("max_msa_sequences", 512) if parameters else 512,
                "template_searcher": parameters.get("template_searcher", "hhsearch") if parameters else "hhsearch",
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
