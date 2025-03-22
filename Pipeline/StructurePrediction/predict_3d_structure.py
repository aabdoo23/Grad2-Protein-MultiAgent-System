from typing import Dict, Any, Optional
import requests
import py3Dmol
from Bio import SeqIO
from io import StringIO, BytesIO
import os
from datetime import datetime
import matplotlib.pyplot as plt
import base64

class StructurePredictor:
    def __init__(self):
        """Initialize the structure predictor."""
        self.api_endpoint = "https://api.esmatlas.com/foldSequence/v1/pdb/"
        self.predicted_structure = None

    def predict_structure(self, sequence: str) -> Dict[str, Any]:
        """Predict the 3D structure of a protein sequence using ESMFold and save it as PDB file.

        Args:
            sequence (str): The protein sequence to predict

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if prediction was successful
                - structure: PDB structure if successful
                - pdb_file: Path to the saved PDB file if successful
                - metrics: Calculated structure quality metrics (including average pLDDT)
                - error: Error message if unsuccessful
        """
        # Use the predictor to get the structure
        prediction_result = self.predictor.predict_structure(sequence)
        
        if not prediction_result['success']:
            return prediction_result
            
        # Create visualization if prediction was successful
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
            'metrics': prediction_result['metrics'],
            'visualization_file': visualization_result['file_path']
        }

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
        """Predict the 3D structure of a protein sequence using ESMFold and save it as PDB file.

        Args:
            sequence (str): The protein sequence to predict

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if prediction was successful
                - structure: PDB structure if successful
                - pdb_file: Path to the saved PDB file if successful
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
                
                # Create visualizations directory if it doesn't exist
                visualization_dir = os.path.join(os.path.dirname(__file__), 'visualizations')
                if not os.path.exists(visualization_dir):
                    os.makedirs(visualization_dir)

                # Save the PDB structure to a file
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                pdb_filename = f'protein_structure_{timestamp}.pdb'
                pdb_file_path = os.path.join(visualization_dir, pdb_filename)
                
                with open(pdb_file_path, 'w', encoding='utf-8') as f:
                    f.write(response.text)
                
                return {
                    'success': True,
                    'structure': response.text,
                    'pdb_file': pdb_file_path,
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

    def plot_plddt_scores(self, pdb_structure: str) -> str:
        """Generate a plot of per-residue pLDDT scores and return it as a base64-encoded PNG image.

        Args:
            pdb_structure (str): The PDB structure string

        Returns:
            str: Base64 encoded PNG image string of the plot
        """
        residues = []
        scores = []
        for line in pdb_structure.splitlines():
            if line.startswith("ATOM"):
                try:
                    # Residue number is typically in columns 23-26
                    residue_num = int(line[22:26].strip())
                    score = float(line[60:66].strip())
                    residues.append(residue_num)
                    scores.append(score)
                except Exception:
                    continue
        # Create the plot
        plt.figure(figsize=(10, 5))
        plt.plot(residues, scores, marker="o", linestyle="-", color="blue")
        plt.xlabel("Residue Number")
        plt.ylabel("pLDDT Score")
        plt.title("Per-Residue pLDDT Score")
        plt.ylim(0, 1)
        plt.grid(True)

        # Save plot to a BytesIO buffer and encode it in base64
        buf = BytesIO()
        plt.savefig(buf, format="png")
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return image_base64

    def visualize_structure(self, structure: Optional[str] = None) -> Dict[str, Any]:
        """Generate a 3D visualization of the predicted structure and a plot of pLDDT scores,
        then save them into an HTML file.

        Args:
            structure (Optional[str]): PDB structure string. If None, uses the last predicted structure

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if visualization was successful
                - html: HTML string containing the 3D visualization and pLDDT plot
                - file_path: Path to the saved visualization file
                - error: Error message if unsuccessful
        """
        if structure is None:
            structure = self.predicted_structure

        if structure is None:
            return {
                'success': False,
                'error': 'No structure available for visualization'
            }

        try:
            # Generate the pLDDT plot and embed it as a base64 image
            plot_base64 = self.plot_plddt_scores(structure)

            # Generate HTML representation with embedded viewer and pLDDT plot
            # Escape the PDB structure for JavaScript
            escaped_structure = structure.replace('\\', '\\\\').replace('`', '\\`')
            
            html_content = f'''
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Protein Structure Visualization</title>
                <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                <script src="https://3dmol.org/build/3Dmol-min.js"></script>
                <style>
                  #viewer {{ height: 600px; width: 800px; position: relative; }}
                </style>
              </head>
              <body>
                <h2>3D Structure Viewer</h2>
                <div id="viewer"></div>
                <script>
                  $(document).ready(function() {{
                    let element = document.getElementById("viewer");
                    let viewer = $3Dmol.createViewer(element, {{backgroundColor: "white"}});
                    let pdbData = `{escaped_structure}`;
                    viewer.addModel(pdbData, "pdb");
                    viewer.setStyle({{}}, {{cartoon: {{color: "spectrum"}}}});
                    viewer.zoomTo();
                    viewer.render();
                  }});
                </script>
                <h2>pLDDT Score Plot</h2>
                <img src="data:image/png;base64,{plot_base64}" alt="pLDDT Plot" style="max-width:800px;">
              </body>
            </html>
            '''

            # Create visualizations directory if it doesn't exist
            visualization_dir = os.path.join(os.path.dirname(__file__), 'visualizations')
            if not os.path.exists(visualization_dir):
                os.makedirs(visualization_dir)

            # Create a unique filename using timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'protein_structure_{timestamp}.html'
            file_path = os.path.join(visualization_dir, filename)

            # Save the visualization to a file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            return {
                'success': True,
                'html': html_content,
                'file_path': file_path
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error saving visualization: {str(e)}'
            }
