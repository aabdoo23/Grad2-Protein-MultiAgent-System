from typing import Dict, Any, Optional
import py3Dmol
import matplotlib.pyplot as plt
import base64
from io import BytesIO
import os
from datetime import datetime

class StructureVisualizer:
    def __init__(self):
        self.visualization_dir = os.path.join(os.path.dirname(__file__), 'visualizations')
        if not os.path.exists(self.visualization_dir):
            os.makedirs(self.visualization_dir)

    def plot_plddt_scores(self, pdb_structure: str) -> str:
        """Generate a plot of per-residue pLDDT scores and return it as a base64-encoded PNG image."""
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

    def _extract_plddt_scores(self, pdb_structure: str) -> tuple[list, list]:
        """Extract pLDDT scores from PDB structure."""
        data = [(int(line[22:26].strip()), float(line[60:66].strip()))
                for line in pdb_structure.splitlines()
                if line.startswith("ATOM")]
        return zip(*data) if data else ([], [])

    def _generate_plot(self, residues: list, scores: list) -> str:
        """Generate a base64 encoded plot image."""
        plt.figure(figsize=(10, 5))
        plt.plot(residues, scores, marker="o", linestyle="-", color="blue")
        plt.xlabel("Residue Number")
        plt.ylabel("pLDDT Score")
        plt.title("Per-Residue pLDDT Score")
        plt.ylim(0, 1)
        plt.grid(True)

        buf = BytesIO()
        plt.savefig(buf, format="png")
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')

    def _generate_html(self, structure: str, plot_base64: str) -> str:
        """Generate HTML content for visualization."""
        escaped_structure = structure.replace('\\', '\\\\').replace('`', '\\`')
        return f'''
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Protein Structure Visualization</title>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script src="https://3dmol.org/build/3Dmol-min.js"></script>
            <style>
              #viewer {{ height: 600px; width: 800px; position: relative; }}
              body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
              h2 {{ color: #333; }}
              .plot-container {{ margin-top: 30px; }}
            </style>
          </head>
          <body>
            <h2>3D Structure Viewer</h2>
            <div id="viewer"></div>
            <script>
              $(document).ready(() => {{                
                const viewer = $3Dmol.createViewer($("#viewer"), {{backgroundColor: "white"}});
                viewer.addModel(`{escaped_structure}`, "pdb");
                viewer.setStyle({{}}, {{cartoon: {{color: "spectrum"}}}}); 
                viewer.zoomTo();
                viewer.render();
              }});
            </script>
            <div class="plot-container">
              <h2>pLDDT Score Plot</h2>
              <img src="data:image/png;base64,{plot_base64}" alt="pLDDT Plot" style="max-width:800px;">
            </div>
          </body>
        </html>'''

    def create_visualization(self, structure: str) -> Dict[str, Any]:
        """Generate and save structure visualization with pLDDT plot."""
        try:
            # Generate plot
            residues, scores = self._extract_plddt_scores(structure)
            if not residues:
                return {'success': False, 'error': 'No valid residues found in structure'}
            
            plot_base64 = self._generate_plot(residues, scores)
            html_content = self._generate_html(structure, plot_base64)

            # Save files
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            html_path = os.path.join(self.visualization_dir, f'protein_structure_{timestamp}.html')
            pdb_path = os.path.join(self.visualization_dir, f'protein_structure_{timestamp}.pdb')

            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            with open(pdb_path, 'w', encoding='utf-8') as f:
                f.write(structure)

            return {
                'success': True,
                'html': html_content,
                'file_path': html_path,
                'pdb_file': pdb_path
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}