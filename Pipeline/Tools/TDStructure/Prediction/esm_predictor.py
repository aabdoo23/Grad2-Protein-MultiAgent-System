import os
import requests
from datetime import datetime
import json
from typing import Dict, Any
from dotenv import load_dotenv
from .base_predictor import BaseStructurePredictor

load_dotenv()

class ESM_Predictor(BaseStructurePredictor):
    def __init__(self):
        super().__init__()
        self.key = os.getenv("NVCF_RUN_KEY")
        self.api_endpoint = "https://health.api.nvidia.com/v1/biology/nvidia/esmfold"
        self.visualization_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'static', 'pdb_files')
        os.makedirs(self.visualization_dir, exist_ok=True)
        self.headers = {
            "Authorization": f"Bearer {self.key}",
            "Accept": "application/json",
        }

    def validate_sequence(self, sequence: str) -> bool:
        valid_residues = set("ACDEFGHIKLMNPQRSTVWY")
        return all(residue in valid_residues for residue in sequence.upper())

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        if not self.validate_sequence(sequence):
            return {"success": False, "error": "Invalid protein sequence."}
            
        try:
            print("Making ESMFold request...")
            payload = {
                "sequence": sequence
            }
            
            # Use a session for better connection handling
            session = requests.Session()
            response = session.post(
                self.api_endpoint,
                headers=self.headers,
                json=payload,
                timeout=600  # 10-minute timeout
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"API error: {response.status_code} - {response.text}"}
                
            result = response.json()
            
            # Check if the response has the expected format
            if "pdbs" in result and len(result["pdbs"]) > 0:
                structure = result["pdbs"][0]
                pdb_file = self.save_structure(structure)
                metrics = self.calculate_metrics(structure)
                return {"success": True, "structure": structure, "pdb_file": pdb_file, "metrics": metrics}
            else:
                return {"success": False, "error": "No PDB structure in ESMFold response"}
                
        except requests.exceptions.Timeout:
            return {"success": False, "error": "ESMFold API request timed out"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Connection error with ESMFold API"}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"Invalid JSON response from ESMFold API: {str(e)}"}
        except Exception as e:
            print(f"Unexpected error in ESMFold predictor: {str(e)}")
            return {"success": False, "error": str(e)}

    def calculate_metrics(self, structure: str) -> Dict[str, float]:
        scores = [float(line[60:66].strip()) for line in structure.splitlines() if line.startswith("ATOM")]
        avg_plddt = sum(scores)/len(scores) if scores else 0.0
        return {"Average pLDDT": avg_plddt}

    def save_structure(self, structure: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdb_path = os.path.join(self.visualization_dir, f"protein_{timestamp}.pdb")
        with open(pdb_path, "w", encoding="utf-8") as f:
            f.write(structure)
        return pdb_path
