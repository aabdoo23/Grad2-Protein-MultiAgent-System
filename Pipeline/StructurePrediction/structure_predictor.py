from typing import Dict, Any
import requests

class StructurePredictor:
    def __init__(self):
        """Initialize the structure predictor."""
        self.api_endpoint = "https://api.esmatlas.com/foldSequence/v1/pdb/"
        self.predicted_structure = None

    def validate_sequence(self, sequence: str) -> bool:
        """Validate if the input is a valid protein sequence.

        Args:
            sequence (str): The protein sequence to validate

        Returns:
            bool: True if valid, False otherwise
        """
        valid_residues = set('ACDEFGHIKLMNPQRSTVWY')
        return all(residue in valid_residues for residue in sequence.upper())

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        """Predict the 3D structure of a protein sequence using ESMFold.

        Args:
            sequence (str): The protein sequence to predict

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if prediction was successful
                - structure: PDB structure if successful
                - metrics: Calculated structure quality metrics (including average pLDDT)
                - error: Error message if unsuccessful
        """
        if not self.validate_sequence(sequence):
            return {
                'success': False,
                'error': 'Invalid protein sequence'
            }

        try:
            response = requests.post(
                self.api_endpoint,
                data=sequence,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code == 200:
                self.predicted_structure = response.text
                
                # Calculate structure quality metrics
                metrics = self.calculate_structure_metrics(response.text)
                
                return {
                    'success': True,
                    'structure': response.text,
                    'metrics': metrics
                }
            else:
                return {
                    'success': False,
                    'error': f'API request failed with status code {response.status_code}'
                }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error during structure prediction: {str(e)}'
            }

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