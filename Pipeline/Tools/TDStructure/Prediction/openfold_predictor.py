import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
from typing import Dict, Any
from .base_predictor import BaseStructurePredictor

load_dotenv()

class OpenFold_Predictor(BaseStructurePredictor):
    def __init__(self):
        super().__init__()
        self.key = os.getenv("NVCF_RUN_KEY") or input("Paste the Run Key: ")
        self.url = "https://health.api.nvidia.com/v1/biology/openfold/openfold2/predict-structure-from-msa-and-template"
        self.headers = {
            "content-type": "application/json",
            "Authorization": f"Bearer {self.key}",
            "NVCF-POLL-SECONDS": "300",
        }

    #selected_models
    #The models to use for structure prediction.
    #Defaults to [1, 2, 3, 4, 5]
    #The models to use for structure prediction.
    selected_models = [1, 2, 3, 4, 5]
    
    #relax_prediction
    #Defaults to false
    #Run structural relaxation after prediction
    relax_prediction = False
    
    
    def predict_structure(self, sequence: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        if not self.validate_sequence(sequence):
            return {"success": False, "error": "Invalid protein sequence."}
            
        try:
            # Use parameters from the job if provided, otherwise use defaults
            selected_models = parameters.get("selected_models", [1, 2, 3, 4, 5]) if parameters else [1, 2, 3, 4, 5]
            relax_prediction = parameters.get("relax_prediction", False) if parameters else False

            data = {
                "sequence": sequence,
                "selected_models": selected_models,
                "relax_prediction": relax_prediction,
            }

            print("Making request...")
            response = requests.post(self.url, headers=self.headers, json=data)

            if response.status_code == 200:
                result = response.json()
                if "structures_in_ranked_order" in result and result["structures_in_ranked_order"]:
                    # Get the highest confidence structure
                    best_structure = max(
                        result["structures_in_ranked_order"],
                        key=lambda x: x.get("confidence", 0)
                    )
                    structure = best_structure["structure"]
                    pdb_file = self.save_structure(structure)
                    metrics = {
                        "Average pLDDT": best_structure.get("confidence", 0),
                        "Model Parameter Set": best_structure.get("model_param_set", 0)
                    }
                    return {"success": True, "structure": structure, "pdb_file": pdb_file, "metrics": metrics}
                else:
                    return {"success": False, "error": "No PDB structure in response"}
            else:
                return {"success": False, "error": f"Unexpected HTTP status: {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
