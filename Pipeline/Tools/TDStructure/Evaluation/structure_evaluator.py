from typing import Dict

class StructureEvaluator:
    def evaluate_3d(self, structure: str) -> Dict[str, float]:
        # Calculate or fetch metrics for the 3D structure
        # For example, you could re-use or enhance the metrics calculated in the predictor.
        return {"plddt": 85.0, "ptm": 0.8, "rmsd": 2.5, "tm_score": 0.75}

    def evaluate_sequence(self, sequence: str) -> Dict[str, float]:
        # Placeholder for primary structure (sequence) evaluation.
        return {"hydrophobicity": 0.45, "charge": 0.1}
