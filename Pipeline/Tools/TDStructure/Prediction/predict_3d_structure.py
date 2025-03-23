from typing import Dict, Any, Optional
from .FoldseekSearcher import FoldseekSearcher
from .structure_predictor import StructurePredictor
from .structure_visualizer import StructureVisualizer

class ProteinStructureAnalyzer:
    def __init__(self):
        self.predictor = StructurePredictor()
        self.visualizer = StructureVisualizer()
        self.foldseek = FoldseekSearcher()

    def predict_and_analyze(self, sequence: str) -> Dict[str, Any]:
        """Predict the 3D structure of a protein sequence and perform analysis.

        Args:
            sequence (str): The protein sequence to predict

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if prediction was successful
                - structure: PDB structure if successful
                - pdb_file: Path to the saved PDB file if successful
                - metrics: Calculated structure quality metrics
                - visualization_file: Path to visualization file if successful
                - foldseek_results: Results from FoldSeek search if successful
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

        # Perform FoldSeek search
        search_result = self.foldseek.submit_foldseek_search(visualization_result['pdb_file'])
        if search_result['success']:
            results = self.foldseek.wait_for_results(
                search_result['ticket_id'],
                max_wait_time=300,
                check_interval=10
            )
            foldseek_data = results if results['success'] else {'error': results['error']}
        else:
            foldseek_data = {'error': search_result['error']}

        return {
            'success': True,
            'structure': prediction_result['structure'],
            'pdb_file': visualization_result['pdb_file'],
            'metrics': prediction_result['metrics'],
            'visualization_file': visualization_result['file_path'],
            'foldseek_results': foldseek_data
        }

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
                - ptm: Predicted TM-score (placeholder)
                - rmsd: Root-mean-square deviation (placeholder)
                - tm_score: Template modeling score (placeholder)
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
            
            # Placeholder values for other metrics
            ptm_score = 0.8  
            rmsd_value = 2.5  
            tm_score = 0.75   
            
            return {
                'plddt': avg_plddt,
                'ptm': ptm_score,
                'rmsd': rmsd_value,
                'tm_score': tm_score
            }
            
        except Exception as e:
            print(f"Error calculating structure metrics: {str(e)}")
            return {
                'plddt': 0.0,
                'ptm': 0.0,
                'rmsd': 0.0,
                'tm_score': 0.0
            }