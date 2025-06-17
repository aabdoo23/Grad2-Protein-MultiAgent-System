import os
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend to avoid Tkinter issues in Flask
import matplotlib.pyplot as plt
from Bio.PDB.PDBParser import PDBParser
import json
import base64
from io import BytesIO
from datetime import datetime
import shutil
import ramplot

class RamachandranAnalyzer:
    def __init__(self):
        self.parser = PDBParser(QUIET=True)
        
    def calculate_dihedral_angle(self, p1, p2, p3, p4):
        """
        Calculate dihedral angle between four points.
        
        Args:
            p1, p2, p3, p4: numpy arrays representing 3D coordinates
            
        Returns:
            float: Dihedral angle in degrees
        """
        # Convert to numpy arrays if needed
        p1, p2, p3, p4 = map(np.array, [p1, p2, p3, p4])
        
        # Calculate vectors
        v1 = p2 - p1
        v2 = p3 - p2
        v3 = p4 - p3
        
        # Calculate normal vectors to planes
        n1 = np.cross(v1, v2)
        n2 = np.cross(v2, v3)
        
        # Normalize
        n1 = n1 / np.linalg.norm(n1)
        n2 = n2 / np.linalg.norm(n2)
        
        # Calculate dihedral angle
        cos_angle = np.dot(n1, n2)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)  # Handle numerical errors
        
        # Determine sign
        cross_product = np.cross(n1, n2)
        sin_angle = np.dot(cross_product, v2 / np.linalg.norm(v2))
        
        angle = np.arctan2(sin_angle, cos_angle)
        return np.degrees(angle)
    
    def extract_phi_psi_angles(self, pdb_file):
        """
        Extract phi and psi angles from a PDB structure.
        
        Args:
            pdb_file (str): Path to PDB file
              Returns:
            list: List of dictionaries containing residue info and angles
        """
        try:
            structure = self.parser.get_structure('protein', pdb_file)
            if structure is None:
                raise Exception("Could not parse PDB structure")
                
            angles_data = []
            
            for model in structure:
                for chain in model:
                    residues = list(chain.get_residues())
                    
                    for i, residue in enumerate(residues):
                        # Skip if not a standard amino acid
                        if residue.get_id()[0] != ' ':  # HETATM
                            continue
                            
                        resname = residue.get_resname()
                        resnum = residue.get_id()[1]
                        chain_id = chain.get_id()
                        
                        phi = None
                        psi = None
                        
                        try:
                            # Get atoms for phi angle (C_prev - N - CA - C)
                            if i > 0:
                                prev_residue = residues[i-1]
                                if prev_residue.has_id('C') and residue.has_id('N') and \
                                   residue.has_id('CA') and residue.has_id('C'):
                                    c_prev = prev_residue['C'].get_coord()
                                    n_curr = residue['N'].get_coord()
                                    ca_curr = residue['CA'].get_coord()
                                    c_curr = residue['C'].get_coord()
                                    phi = self.calculate_dihedral_angle(c_prev, n_curr, ca_curr, c_curr)
                            
                            # Get atoms for psi angle (N - CA - C - N_next)
                            if i < len(residues) - 1:
                                next_residue = residues[i+1]
                                if residue.has_id('N') and residue.has_id('CA') and \
                                   residue.has_id('C') and next_residue.has_id('N'):
                                    n_curr = residue['N'].get_coord()
                                    ca_curr = residue['CA'].get_coord()
                                    c_curr = residue['C'].get_coord()
                                    n_next = next_residue['N'].get_coord()
                                    psi = self.calculate_dihedral_angle(n_curr, ca_curr, c_curr, n_next)
                            
                        except KeyError:
                            # Missing atoms, skip this residue
                            continue
                          # Only add if we have both angles
                        if phi is not None and psi is not None:
                            angles_data.append({
                                'chain': chain_id,
                                'residue_number': int(resnum),
                                'residue_name': resname,
                                'phi': float(phi),
                                'psi': float(psi)
                            })
                            
            return angles_data
            
        except Exception as e:
            raise Exception(f"Error extracting angles from PDB file: {str(e)}")
    
    def classify_secondary_structure(self, phi, psi):
        """
        Classify secondary structure based on phi/psi angles.
        
        Args:
            phi (float): Phi angle in degrees
            psi (float): Psi angle in degrees
            
        Returns:
            str: Secondary structure classification
        """
        # Convert to radians for easier comparison
        phi_rad = np.radians(phi)
        psi_rad = np.radians(psi)
        
        # Alpha helix region
        if -90 <= phi <= -30 and -70 <= psi <= 50:
            return 'Alpha Helix'
        
        # Beta sheet region
        elif -180 <= phi <= -90 and 90 <= psi <= 180:
            return 'Beta Sheet'
        elif -180 <= phi <= -90 and -180 <= psi <= -90:
            return 'Beta Sheet'          # Left-handed helix        
        elif 30 <= phi <= 90 and -20 <= psi <= 80:
            return 'Left-handed Helix'
          # Extended/Other
        else:
            return 'Other/Extended'
    
    def create_ramachandran_plot(self, angles_data, output_path=None, pdb_file=None):
        """
        Create a Ramachandran plot from phi/psi angle data using ramplot.
        
        Args:
            angles_data (list): List of angle dictionaries
            output_path (str): Optional path to save the plot
            pdb_file (str): Path to the original PDB file (required for ramplot)
            
        Returns:
            dict: Plot data including base64 encoded image and statistics
        """
        try:
            # Ensure we're using the non-interactive backend
            matplotlib.use('Agg')
              # If we have the PDB file, use ramplot directly
            if pdb_file and os.path.exists(pdb_file):
                # Create temporary directories in static folder for ramplot
                # ramplot requires InputPath to be a directory containing PDB files
                static_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'static')
                ramachandran_dir = os.path.join(static_dir, 'ramachandran_results')
                
                # Ensure ramachandran results directory exists
                os.makedirs(ramachandran_dir, exist_ok=True)
                
                # Create temporary subdirectories with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                temp_input_dir = os.path.join(ramachandran_dir, f'temp_input_{timestamp}')
                temp_output_dir = os.path.join(ramachandran_dir, f'temp_output_{timestamp}')
                
                try:
                    # Create temporary directories
                    os.makedirs(temp_input_dir, exist_ok=True)
                    os.makedirs(temp_output_dir, exist_ok=True)
                    
                    # Copy PDB file to temporary input directory
                    pdb_filename = os.path.basename(pdb_file)
                    temp_pdb_path = os.path.join(temp_input_dir, pdb_filename)
                    shutil.copy2(pdb_file, temp_pdb_path)
                      
                    # Use ramplot to generate the Ramachandran plot
                    # MapType: 0 = 2D & 3D All, 1 = only 2D, 2 = only 3D
                    ramplot.TorsionAngleCalculation(
                        InputPath=temp_input_dir,
                        OutPutDir=temp_output_dir,
                        MapType=1,  # Only 2D Ramachandran plot
                        PlotResolutions=300,  # High resolution
                        PlotFileType='png'  # PNG format
                    )
                    
                    # Find the generated plot file
                    plots_dir = os.path.join(temp_output_dir, 'Plots')
                    if os.path.exists(plots_dir):
                        plot_files = [f for f in os.listdir(plots_dir) if f.endswith('.png')]
                        if plot_files:
                            # Prefer 2D all or 2D general plot
                            preferred_files = [f for f in plot_files if 'MapType2D' in f or '2D' in f]
                            if preferred_files:
                                plot_file = os.path.join(plots_dir, preferred_files[0])
                            else:
                                plot_file = os.path.join(plots_dir, plot_files[0])
                            
                            # Read the plot and convert to base64
                            with open(plot_file, 'rb') as f:
                                plot_base64 = base64.b64encode(f.read()).decode()
                            
                            # Copy to output path if specified
                            if output_path:
                                shutil.copy2(plot_file, output_path)
                        else:
                            raise Exception("Ramplot did not generate any PNG plot files")
                    else:
                        raise Exception("Ramplot did not create Plots directory")
                        
                finally:
                    # Clean up temporary directories
                    try:
                        if os.path.exists(temp_input_dir):
                            shutil.rmtree(temp_input_dir)
                        if os.path.exists(temp_output_dir):
                            shutil.rmtree(temp_output_dir)
                    except Exception as cleanup_error:
                        # Log cleanup error but don't fail the main operation
                        print(f"Warning: Failed to clean up temporary directories: {cleanup_error}")
            else:
                # Fallback to manual plotting if PDB file is not available
                return self._create_manual_ramachandran_plot(angles_data, output_path)
            
            # Calculate statistics
            total_residues = len(angles_data)
            alpha_count = sum(1 for data in angles_data if self.classify_secondary_structure(data['phi'], data['psi']) == 'Alpha Helix')
            beta_count = sum(1 for data in angles_data if self.classify_secondary_structure(data['phi'], data['psi']) == 'Beta Sheet')
            other_count = total_residues - alpha_count - beta_count
            
            # Calculate detailed statistics
            secondary_structure_stats = {
                'alpha_helix': int(alpha_count),
                'beta_sheet': int(beta_count),
                'other': int(other_count),
                'total': int(total_residues),
                'alpha_percentage': float(alpha_count/total_residues*100 if total_residues > 0 else 0),
                'beta_percentage': float(beta_count/total_residues*100 if total_residues > 0 else 0),
                'other_percentage': float(other_count/total_residues*100 if total_residues > 0 else 0)
            }
            
            return {
                'plot_base64': plot_base64,
                'statistics': secondary_structure_stats,
                'angle_data': angles_data,
                'output_path': output_path
            }
            
        except Exception as e:
            raise Exception(f"Error creating Ramachandran plot: {str(e)}")
    
    def _create_manual_ramachandran_plot(self, angles_data, output_path=None):
        """
        Fallback method to create Ramachandran plot manually when ramplot fails.
        """
        # Create figure with high DPI for better quality
        fig, ax = plt.subplots(figsize=(10, 8), dpi=150)
        
        # Extract phi and psi values
        phi_values = [data['phi'] for data in angles_data]
        psi_values = [data['psi'] for data in angles_data]
        
        # Create scatter plot
        scatter = ax.scatter(phi_values, psi_values, alpha=0.6, s=20, c='red', edgecolors='black', linewidth=0.5)
        
        # Set labels and title
        ax.set_xlabel('φ (Phi) angle (degrees)', fontsize=12, fontweight='bold')
        ax.set_ylabel('ψ (Psi) angle (degrees)', fontsize=12, fontweight='bold')
        ax.set_title('Ramachandran Plot', fontsize=14, fontweight='bold')
        
        # Set axis limits and grid
        ax.set_xlim(-180, 180)
        ax.set_ylim(-180, 180)
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
        
        # Add axis lines at zero
        ax.axhline(y=0, color='k', linewidth=0.5)
        ax.axvline(x=0, color='k', linewidth=0.5)
        
        # Calculate statistics
        total_residues = len(angles_data)
        alpha_count = sum(1 for data in angles_data if self.classify_secondary_structure(data['phi'], data['psi']) == 'Alpha Helix')
        beta_count = sum(1 for data in angles_data if self.classify_secondary_structure(data['phi'], data['psi']) == 'Beta Sheet')
        other_count = total_residues - alpha_count - beta_count
        
        # Add statistics text
        stats_text = f'Total residues: {total_residues}\n'
        stats_text += f'Alpha helix: {alpha_count} ({alpha_count/total_residues*100:.1f}%)\n'
        stats_text += f'Beta sheet: {beta_count} ({beta_count/total_residues*100:.1f}%)\n'
        stats_text += f'Other: {other_count} ({other_count/total_residues*100:.1f}%)'
        
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, fontsize=10,
               verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
        
        plt.tight_layout()
        
        # Save to file if path provided
        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
        
        # Convert plot to base64 string
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        plot_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Important: Close the figure to free memory and avoid threading issues
        plt.close(fig)
        buffer.close()
        
        return plot_base64
    
    def generate_ramachandran_analysis(self, pdb_file, output_dir=None):
        """
        Complete Ramachandran analysis workflow.
        
        Args:
            pdb_file (str): Path to PDB file
            output_dir (str): Optional output directory
            
        Returns:
            dict: Complete analysis results
        """
        try:
            # Create output directory if specified
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            # Extract angles
            angles_data = self.extract_phi_psi_angles(pdb_file)
            
            if not angles_data:
                return {
                    'success': False,
                    'error': 'No phi/psi angles could be extracted from the structure'
                }
            
            # Generate output path
            pdb_name = os.path.splitext(os.path.basename(pdb_file))[0]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            plot_filename = f"ramachandran_{pdb_name}_{timestamp}.png"
            data_filename = f"ramachandran_data_{pdb_name}_{timestamp}.json"
            
            plot_path = os.path.join(output_dir, plot_filename) if output_dir else None
            data_path = os.path.join(output_dir, data_filename) if output_dir else None
              # Create Ramachandran plot
            plot_results = self.create_ramachandran_plot(angles_data, plot_path, pdb_file)
              # Prepare complete results
            results = {
                'success': True,
                'pdb_file': pdb_file,
                'plot_base64': plot_results['plot_base64'],
                'plot_path': plot_path,
                'statistics': plot_results['statistics'],
                'residue_count': int(len(angles_data)),
                'angle_data': angles_data,
                'timestamp': timestamp
            }
            
            # Save data to JSON file if output directory specified
            if data_path:
                with open(data_path, 'w') as f:
                    # Create a copy without the base64 data for file storage
                    file_data = results.copy()
                    file_data.pop('plot_base64', None)  # Remove large base64 data from file
                    json.dump(file_data, f, indent=2)
                results['data_path'] = data_path
            
            return results
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Ramachandran analysis failed: {str(e)}"
            }

# Example usage and testing
if __name__ == "__main__":
    analyzer = RamachandranAnalyzer()
    
    # Test with a sample PDB file (you would replace this with an actual file)
    # result = analyzer.generate_ramachandran_analysis("sample.pdb", "output/")
    # print(json.dumps(result, indent=2))
