from typing import Dict, Any, Optional
from .FoldseekSearcher import FoldseekSearcher
from .structure_predictor import StructurePredictor
from .structure_visualizer import StructureVisualizer

class ProteinStructureAnalyzer:
    def __init__(self):
        self.predictor = StructurePredictor()
        self.visualizer = StructureVisualizer()
        self.foldseek = FoldseekSearcher()

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        """Predict the 3D structure of a protein sequence.

        Args:
            sequence (str): The protein sequence to predict

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if prediction was successful
                - structure: PDB structure if successful
                - pdb_file: Path to the saved PDB file if successful
                - visualization_file: Path to visualization file if successful
                - error: Error message if unsuccessful
        """
        # Predict structure
        prediction_result = self.predictor.predict_structure(sequence)
        if not prediction_result['success']:
            return prediction_result

        # Create visualization
        visualization_result = self.visualizer.create_visualization(prediction_result['structure'])
        if not visualization_result['success']:
            return {
                'success': False,
                'error': f'Error creating visualization: {visualization_result["error"]}'
            }

        return {
            'success': True,
            'structure': prediction_result['structure'],
            'pdb_file': visualization_result['pdb_file'],
            'visualization_file': visualization_result['file_path']
        }

    def search_similar_structures(self, pdb_file: str) -> Dict[str, Any]:
        """Search for similar structures using FoldSeek.

        Args:
            pdb_file (str): Path to the PDB file to search

        Returns:
            Dict[str, Any]: FoldSeek search results
        """
        search_result = self.foldseek.submit_search(pdb_file)
        if not search_result['success']:
            return search_result

        results = self.foldseek.wait_for_results(
            search_result['ticket_id'],
            max_wait=300,
            interval=10
        )
        return results

    def validate_sequence(self, sequence: str) -> bool:
        """Validate if the input is a valid protein sequence.

        Args:
            sequence (str): The protein sequence to validate

        Returns:
            bool: True if valid, False otherwise
        """
        return self.predictor.validate_sequence(sequence)

    def calculate_structure_metrics(self, pdb_structure: str) -> Dict[str, float]:
        """Calculate quality metrics for the predicted structure.

        Args:
            pdb_structure (str): The PDB structure string

        Returns:
            Dict[str, float]: Dictionary containing structure quality metrics:
                - plddt: Average per-residue confidence score (0-100)
        """
        try:
            # Parse PDB structure to extract B-factor values (pLDDT scores)
            plddt_scores = []
            for line in pdb_structure.split('\n'):
                if line.startswith('ATOM'):
                    try:
                        b_factor = float(line[60:66].strip())
                        plddt_scores.append(b_factor)
                    except (ValueError, IndexError):
                        continue
            
            # Calculate average pLDDT score
            avg_plddt = sum(plddt_scores) / len(plddt_scores) if plddt_scores else 0.0 
            
            return {
                'plddt': avg_plddt,
                }
            
        except Exception as e:
            print(f"Error calculating structure metrics: {str(e)}")
            return {
                'plddt': 0.0,
            }