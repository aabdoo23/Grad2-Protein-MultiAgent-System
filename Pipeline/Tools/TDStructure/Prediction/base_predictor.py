import os
from datetime import datetime
from typing import Dict, Any
from abc import ABC, abstractmethod

class BaseStructurePredictor(ABC):
    def __init__(self):
        self.visualization_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'static', 'pdb_files')
        os.makedirs(self.visualization_dir, exist_ok=True)

    def validate_sequence(self, sequence: str) -> bool:
        valid_residues = set("ACDEFGHIKLMNPQRSTVWY")
        return all(residue in valid_residues for residue in sequence.upper())

    @abstractmethod
    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        pass

    def save_structure(self, structure: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        pdb_path = os.path.join(self.visualization_dir, f"protein_{timestamp}.pdb")
        with open(pdb_path, "w", encoding="utf-8") as f:
            f.write(structure)
        return pdb_path

    def calculate_metrics(self, structure: str) -> Dict[str, float]:
        scores = [float(line[60:66].strip()) for line in structure.splitlines() if line.startswith("ATOM")]
        avg_plddt = sum(scores)/len(scores) if scores else 0.0
        return {"Average pLDDT": avg_plddt} 