import os
import requests
from datetime import datetime
from typing import Dict, Any

class StructurePredictor:
    def __init__(self):
        self.api_endpoint = "https://api.esmatlas.com/foldSequence/v1/pdb/"
        self.visualization_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'static', 'pdb_files')
        os.makedirs(self.visualization_dir, exist_ok=True)

    def validate_sequence(self, sequence: str) -> bool:
        valid_residues = set("ACDEFGHIKLMNPQRSTVWY")
        return all(residue in valid_residues for residue in sequence.upper())

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        if not self.validate_sequence(sequence):
            return {"success": False, "error": "Invalid protein sequence."}
        try:
            response = requests.post(
                self.api_endpoint,
                data=sequence,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code != 200:
                return {"success": False, "error": f"API error: {response.status_code}"}
            structure = response.text
            pdb_file = self.save_structure(structure)
            metrics = self.calculate_metrics(structure)
            return {"success": True, "structure": structure, "pdb_file": pdb_file, "metrics": metrics}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def calculate_metrics(self, structure: str) -> Dict[str, float]:
        scores = [float(line[60:66].strip()) for line in structure.splitlines() if line.startswith("ATOM")]
        avg_plddt = sum(scores)/len(scores) if scores else 0.0
        return {"plddt": avg_plddt}

    def save_structure(self, structure: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdb_path = os.path.join(self.visualization_dir, f"protein_{timestamp}.pdb")
        with open(pdb_path, "w", encoding="utf-8") as f:
            f.write(structure)
        return pdb_path
