from typing import Dict, Any, Optional
import py3Dmol
import matplotlib.pyplot as plt
import base64
from io import BytesIO
import os
from datetime import datetime

class StructureVisualizer:
    def __init__(self):
        """Initialize the structure visualizer."""
        self.visualization_dir = os.path.join(os.path.dirname(__file__), 'visualizations')
        if not os.path.exists(self.visualization_dir):
            os.makedirs(self.visualization_dir)

    def save_pdb_file(self, structure: str) -> str:
        """Save the PDB structure to a file.

        Args:
            structure (str): The PDB structure string

        Returns:
            str: Path to the saved PDB file
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        pdb_filename = f'protein_structure_{timestamp}.pdb'
        pdb_file_path = os.path.join(self.visualization_dir, pdb_filename)
        
        with open(pdb_file_path, 'w', encoding='utf-8') as f:
            f.write(structure)
        
        return pdb_file_path

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
                    residue_num = int(line[22:26].strip())
                    score = float(line[60:66].strip())
                    residues.append(residue_num)
                    scores.append(score)
                except Exception:
                    continue

        plt.figure(figsize=(10, 5))
        plt.plot(residues, scores, marker="o", linestyle="-", color="blue")
        plt.xlabel("Residue Number")
        plt.ylabel("pLDDT Score")
        plt.title("Per-Residue pLDDT Score")
        plt.ylim(0, 1)
        plt.grid(True)

        buf = BytesIO()
        plt.savefig(buf, format="png")
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return image_base64

    def create_visualization(self, structure: str) -> Dict[str, Any]:
        """Generate a 3D visualization of the structure and a plot of pLDDT scores,
        then save them into an HTML file.

        Args:
            structure (str): PDB structure string

        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if visualization was successful
                - html: HTML string containing the 3D visualization and pLDDT plot
                - file_path: Path to the saved visualization file
                - error: Error message if unsuccessful
        """
        try:
            # Generate the pLDDT plot
            plot_base64 = self.plot_plddt_scores(structure)

            # Save PDB file
            pdb_file_path = self.save_pdb_file(structure)

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

            # Save visualization to HTML file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            html_filename = f'protein_structure_{timestamp}.html'
            html_file_path = os.path.join(self.visualization_dir, html_filename)

            with open(html_file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            return {
                'success': True,
                'html': html_content,
                'file_path': html_file_path,
                'pdb_file': pdb_file_path
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error creating visualization: {str(e)}'
            }