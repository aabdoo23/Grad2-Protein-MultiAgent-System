import subprocess
import os
import csv
import platform
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import logging
from biopandas.pdb import PandasPdb
import numpy as np

class PrankTool:
    """
    A tool for running P2Rank to predict protein binding sites and extract binding site information.
    """
    def __init__(self, p2rank_path: str = None, base_result_path: str = None):
        """
        Initialize the PrankTool.
        
        Args:
            p2rank_path: Path to the P2Rank executable
            base_result_path: Base directory for storing P2Rank results
        """
        # Default paths relative to the Tools/Docking/P2Rank directory
        if p2rank_path is None:
            self.p2rank_path = self._get_p2rank_executable_path()
        else:
            self.p2rank_path = p2rank_path
            
        if base_result_path is None:
            current_dir = Path(__file__).parent
            self.base_result_path = str(current_dir / '..' / '..' / '..' / 'static' / 'prank_results')
        else:
            self.base_result_path = base_result_path
            
        self.logger = logging.getLogger(__name__)
        
        # Check P2Rank installation
        if not self._check_p2rank_installation():
            raise FileNotFoundError(f"P2Rank not found or not executable at {self.p2rank_path}")
    
    def _get_p2rank_executable_path(self) -> str:
        """Get the correct P2Rank executable path based on the current OS."""
        current_dir = Path(__file__).parent
        if platform.system() == "Windows":
            return str(current_dir / 'p2rank_2.5' / 'prank.bat')
        else:
            # Linux/Mac path
            return str(current_dir / 'p2rank_2.5' / 'prank')
    
    def _check_p2rank_installation(self) -> bool:
        """Check if P2Rank executable is available and executable."""
        if not os.path.exists(self.p2rank_path):
            self.logger.error(f"P2Rank executable not found at {self.p2rank_path}")
            return False
        
        # Check if file is executable (important for Linux)
        if not os.access(self.p2rank_path, os.X_OK):
            self.logger.error(f"P2Rank is not executable at {self.p2rank_path}")
            return False
            
        self.logger.info("P2Rank executable found and is executable.")
        return True
    
    def predict_binding_sites(self, pdb_path: str, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Run P2Rank prediction on a PDB file.
        
        Args:
            pdb_path: Path to the input PDB file
            output_dir: Optional custom output directory. If None, uses base_result_path with PDB filename
            
        Returns:
            Dictionary containing prediction results and file paths
        """
        try:
            # Check P2Rank installation first
            if not self._check_p2rank_installation():
                return {"success": False, "error": "P2Rank executable not found or not executable"}
            
            # Extract the filename without extension
            pdb_filename = Path(pdb_path).stem
            
            # Create a specific result folder for this PDB file
            if output_dir is None:
                result_path = os.path.join(self.base_result_path, pdb_filename)
            else:
                result_path = output_dir
              # Ensure the result directory exists
            os.makedirs(result_path, exist_ok=True)
              # Get the P2Rank directory to run the command from the correct location
            p2rank_dir = Path(self.p2rank_path).parent
            prank_executable = Path(self.p2rank_path).name
            
            # Define the command with absolute paths
            # On Windows, use just the executable name; on Unix, use ./executable
            if platform.system() == "Windows":
                command = f'{prank_executable} predict -f "{os.path.abspath(pdb_path)}" -o "{os.path.abspath(result_path)}"'
            else:
                command = f'./{prank_executable} predict -f "{os.path.abspath(pdb_path)}" -o "{os.path.abspath(result_path)}"'
            
            self.logger.info(f"Running P2Rank command: {command}")
            self.logger.info(f"Working directory: {p2rank_dir}")
            
            # Execute the command from the P2Rank directory
            result = subprocess.run(
                command, 
                shell=True, 
                check=True, 
                text=True, 
                capture_output=True,
                cwd=str(p2rank_dir)  # Run from P2Rank directory
            )
            
            # Expected output files
            predictions_csv = os.path.join(result_path, f"{pdb_filename}.pdb_predictions.csv")
            residues_csv = os.path.join(result_path, f"{pdb_filename}.pdb_residues.csv")
            
            return {
                'success': True,
                'pdb_filename': pdb_filename,
                'result_path': result_path,
                'predictions_csv': predictions_csv,
                'residues_csv': residues_csv,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"P2Rank execution failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'stderr': e.stderr if hasattr(e, 'stderr') else ''
            }
        except Exception as e:
            self.logger.error(f"Unexpected error during P2Rank execution: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def parse_predictions_csv(self, csv_path: str) -> List[Dict[str, Any]]:
        """
        Parse the P2Rank predictions CSV file to extract all binding site information.
        
        Args:
            csv_path: Path to the predictions CSV file
            
        Returns:
            List of dictionaries containing binding site information
        """
        binding_sites = []
        
        try:
            with open(csv_path, 'r', newline='') as f:
                # Read and clean the header
                header_line = f.readline().strip()
                headers = [h.strip() for h in header_line.split(',')]
                
                # Create CSV reader with cleaned headers
                f.seek(0)  # Reset file pointer
                reader = csv.DictReader(f, fieldnames=headers)
                next(reader)  # Skip the header row
                
                for row in reader:
                    # Clean the row data (remove extra whitespace)
                    cleaned_row = {k.strip(): v.strip() if v else '' for k, v in row.items()}
                    
                    # Convert numeric fields to appropriate types
                    site_info = self._convert_numeric_fields(cleaned_row)
                    binding_sites.append(site_info)
                    
        except FileNotFoundError:
            self.logger.error(f"Predictions CSV file not found: {csv_path}")
            raise
        except Exception as e:
            self.logger.error(f"Error parsing predictions CSV: {e}")
            raise
            
        return binding_sites
    
    def _convert_numeric_fields(self, row: Dict[str, str]) -> Dict[str, Any]:
        """
        Convert string fields from CSV to appropriate numeric types.
        
        Args:
            row: Dictionary with string values from CSV
            
        Returns:
            Dictionary with converted numeric values
        """
        converted = {}
        
        # Define numeric fields and their types
        numeric_fields = {
            'rank': int,
            'score': float,
            'probability': float,
            'sas_points': int,
            'surf_atoms': int,
            'center_x': float,
            'center_y': float,
            'center_z': float,
            'residue_ids': str,  # Keep as string (comma-separated list)
            'surf_atom_ids': str  # Keep as string (comma-separated list)
        }
        
        for key, value in row.items():
            if key in numeric_fields and value:
                try:
                    if numeric_fields[key] == int:
                        converted[key] = int(value)
                    elif numeric_fields[key] == float:
                        converted[key] = float(value)
                    else:
                        converted[key] = value
                except (ValueError, TypeError):
                    self.logger.warning(f"Could not convert {key}='{value}' to {numeric_fields[key]}")
                    converted[key] = value
            else:
                converted[key] = value
                
        return converted
    
    def get_top_binding_site(self, csv_path: str) -> Dict[str, Any]:
        """
        Get the top-ranked binding site from P2Rank predictions.
        
        Args:
            csv_path: Path to the predictions CSV file
            
        Returns:
            Dictionary containing the top binding site information
        """
        binding_sites = self.parse_predictions_csv(csv_path)
        
        if not binding_sites:
            raise ValueError('No binding sites found in P2Rank results')
            
        # Return the first (top-ranked) binding site
        return binding_sites[0]
    
    def get_binding_site_centers(self, csv_path: str) -> List[Tuple[float, float, float]]:
        """
        Extract center coordinates for all predicted binding sites.
        
        Args:
            csv_path: Path to the predictions CSV file
            
        Returns:
            List of tuples containing (x, y, z) coordinates
        """
        binding_sites = self.parse_predictions_csv(csv_path)
        centers = []
        
        for site in binding_sites:
            try:
                x = site['center_x']
                y = site['center_y']
                z = site['center_z']
                centers.append((x, y, z))
            except KeyError as e:
                self.logger.warning(f"Missing coordinate field in binding site: {e}")
                continue
                
        return centers
    
    def get_top_n_sites(self, csv_path: str, n: int = 5) -> List[Dict[str, Any]]:
        """
        Get the top N binding sites ranked by score.
        
        Args:
            csv_path: Path to the predictions CSV file
            n: Number of top sites to return
            
        Returns:
            List of dictionaries containing top N binding site information
        """
        binding_sites = self.parse_predictions_csv(csv_path)
        
        # Sort by rank (should already be sorted, but ensure it)
        binding_sites.sort(key=lambda x: x.get('rank', float('inf')))
        
        return binding_sites[:n]
    
    def filter_sites_by_score(self, csv_path: str, min_score: float = 0.5) -> List[Dict[str, Any]]:
        """
        Filter binding sites by minimum score threshold.
        
        Args:
            csv_path: Path to the predictions CSV file
            min_score: Minimum score threshold
            
        Returns:
            List of binding sites with score >= min_score
        """
        binding_sites = self.parse_predictions_csv(csv_path)
        
        filtered_sites = [
            site for site in binding_sites 
            if site.get('score', 0) >= min_score
        ]
        
        return filtered_sites
    
    def get_site_summary(self, csv_path: str) -> Dict[str, Any]:
        """
        Get a summary of all predicted binding sites.
        
        Args:
            csv_path: Path to the predictions CSV file
            
        Returns:
            Dictionary containing summary statistics
        """
        binding_sites = self.parse_predictions_csv(csv_path)
        
        if not binding_sites:
            return {
                'total_sites': 0,
                'sites': []
            }
        
        scores = [site.get('score', 0) for site in binding_sites]
        
        summary = {
            'total_sites': len(binding_sites),
            'max_score': max(scores) if scores else 0,
            'min_score': min(scores) if scores else 0,
            'avg_score': sum(scores) / len(scores) if scores else 0,
            'sites': binding_sites
        }
        
        return summary
    
    def run_full_analysis(self, pdb_path: str, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Run complete P2Rank analysis including prediction and parsing.
        
        Args:
            pdb_path: Path to the input PDB file
            output_dir: Optional custom output directory
            
        Returns:
            Complete analysis results including all binding site information
        """
        # Run P2Rank prediction
        prediction_result = self.predict_binding_sites(pdb_path, output_dir)
        
        if not prediction_result['success']:
            return prediction_result
          # Parse the results
        try:
            csv_path = prediction_result['predictions_csv']
            binding_sites = self.parse_predictions_csv(csv_path)
            summary = self.get_site_summary(csv_path)
            
            # Calculate docking box parameters for each binding site
            binding_sites_with_boxes = []
            for site in binding_sites:
                try:
                    # Calculate optimal docking box for this site
                    box_params = self.calculate_docking_box(pdb_path, site)
                    
                    # Add box parameters to the site data
                    site_with_box = site.copy()
                    site_with_box['docking_box'] = box_params
                    binding_sites_with_boxes.append(site_with_box)
                    
                except Exception as e:
                    self.logger.warning(f"Could not calculate box for site {site.get('rank', 'unknown')}: {e}")
                    # Still include the site without box data
                    binding_sites_with_boxes.append(site)
            
            return {
                'success': True,
                'pdb_filename': prediction_result['pdb_filename'],
                'result_path': prediction_result['result_path'],
                'predictions_csv': csv_path,
                'residues_csv': prediction_result['residues_csv'],
                'binding_sites': binding_sites_with_boxes,
                'summary': summary,
                'top_site': binding_sites_with_boxes[0] if binding_sites_with_boxes else None
            }
            
        except Exception as e:
            self.logger.error(f"Error parsing P2Rank results: {e}")
            return {
                'success': False,
                'error': f"Failed to parse results: {str(e)}",
                'prediction_result': prediction_result
            }
    
    def calculate_docking_box(self, pdb_path: str, binding_site: Dict[str, Any], 
                             buffer: float = 5.0, min_size: float = 15.0) -> Dict[str, float]:
        """
        Calculate optimal docking box size and center from binding site prediction.
        
        Args:
            pdb_path: Path to the PDB file
            binding_site: Binding site data from P2Rank predictions
            buffer: Buffer distance to add around the pocket atoms (default: 5.0 Å)
            min_size: Minimum box size in each dimension (default: 15.0 Å)
            
        Returns:
            Dictionary containing center coordinates and box dimensions for docking
        """
        try:
            ppdb = PandasPdb().read_pdb(pdb_path)
            atoms_df = ppdb.df['ATOM']
            
            # Parse surface atom IDs if available
            if 'surf_atom_ids' in binding_site and binding_site['surf_atom_ids']:
                try:
                    # Parse comma-separated atom IDs
                    surf_atom_ids = [int(a.strip()) for a in str(binding_site['surf_atom_ids']).split(',') if a.strip()]
                    
                    if surf_atom_ids:
                        # Filter atoms by surface atom IDs
                        pocket_atoms = atoms_df[atoms_df['atom_number'].isin(surf_atom_ids)]
                        
                        if not pocket_atoms.empty:
                            return self._calculate_box_from_atoms(pocket_atoms, buffer, min_size)
                        else:
                            self.logger.warning("No pocket atoms found with given surface atom IDs")
                            
                except (ValueError, TypeError) as e:
                    self.logger.warning(f"Could not parse surface atom IDs: {e}")
            
            # Fallback: use residue-based approach
            if 'residue_ids' in binding_site and binding_site['residue_ids']:
                try:
                    return self._calculate_box_from_residues(atoms_df, binding_site, buffer, min_size)
                except Exception as e:
                    self.logger.warning(f"Could not calculate box from residues: {e}")
            
            # Final fallback: use center with adaptive box size
            return self._calculate_adaptive_box(atoms_df, binding_site, buffer, min_size)
            
        except Exception as e:
            self.logger.error(f"Error calculating docking box: {e}")
            # Return default box centered on binding site
            return {
                'center_x': binding_site['center_x'],
                'center_y': binding_site['center_y'],
                'center_z': binding_site['center_z'],
                'size_x': 20.0,
                'size_y': 20.0,
                'size_z': 20.0
            }
    
    def _calculate_box_from_atoms(self, pocket_atoms, buffer: float, min_size: float) -> Dict[str, float]:
        """Calculate box from pocket atom coordinates."""
        # Get spatial extents
        min_x, max_x = pocket_atoms['x_coord'].min(), pocket_atoms['x_coord'].max()
        min_y, max_y = pocket_atoms['y_coord'].min(), pocket_atoms['y_coord'].max()
        min_z, max_z = pocket_atoms['z_coord'].min(), pocket_atoms['z_coord'].max()
        
        # Calculate center
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        center_z = (min_z + max_z) / 2
        
        # Calculate box dimensions with buffer
        size_x = max((max_x - min_x) + (2 * buffer), min_size)
        size_y = max((max_y - min_y) + (2 * buffer), min_size)
        size_z = max((max_z - min_z) + (2 * buffer), min_size)
        
        return {
            'center_x': center_x,
            'center_y': center_y,
            'center_z': center_z,
            'size_x': size_x,
            'size_y': size_y,
            'size_z': size_z
        }
    
    def _calculate_box_from_residues(self, atoms_df, binding_site: Dict[str, Any], 
                                   buffer: float, min_size: float) -> Dict[str, float]:
        """Calculate box from residue IDs."""
        residue_ids_str = str(binding_site['residue_ids'])
        
        # Parse residue IDs (format: "A_123,A_124,B_456")
        residue_specs = []
        for res_id in residue_ids_str.split(','):
            res_id = res_id.strip()
            if '_' in res_id:
                chain, res_num = res_id.split('_', 1)
                try:
                    residue_specs.append((chain.strip(), int(res_num.strip())))
                except ValueError:
                    continue
        
        if not residue_specs:
            raise ValueError("No valid residue specifications found")
        
        # Filter atoms by residue specifications
        pocket_atoms = atoms_df[
            atoms_df.apply(
                lambda row: (row['chain_id'], row['residue_number']) in residue_specs, 
                axis=1
            )
        ]
        
        if pocket_atoms.empty:
            raise ValueError("No atoms found for specified residues")
        
        return self._calculate_box_from_atoms(pocket_atoms, buffer, min_size)
    
    def _calculate_adaptive_box(self, atoms_df, binding_site: Dict[str, Any], 
                              buffer: float, min_size: float) -> Dict[str, float]:
        """Calculate adaptive box size based on protein size and binding site score."""
        center_x = binding_site['center_x']
        center_y = binding_site['center_y']
        center_z = binding_site['center_z']
        
        # Get all atoms within a reasonable distance of the binding site center
        distances = np.sqrt(
            (atoms_df['x_coord'] - center_x)**2 + 
            (atoms_df['y_coord'] - center_y)**2 + 
            (atoms_df['z_coord'] - center_z)**2
        )
        
        # Find atoms within 15 Å of binding site center
        nearby_atoms = atoms_df[distances <= 15.0]
        
        if not nearby_atoms.empty:
            # Calculate box size based on nearby atoms
            span_x = nearby_atoms['x_coord'].max() - nearby_atoms['x_coord'].min()
            span_y = nearby_atoms['y_coord'].max() - nearby_atoms['y_coord'].min()
            span_z = nearby_atoms['z_coord'].max() - nearby_atoms['z_coord'].min()
            
            # Use score to influence box size (higher score = smaller box)
            score_factor = max(0.7, min(1.3, 1.0 - (binding_site.get('score', 3.0) - 3.0) * 0.1))
            
            size_x = max(min_size, (span_x * 0.8 + buffer) * score_factor)
            size_y = max(min_size, (span_y * 0.8 + buffer) * score_factor)
            size_z = max(min_size, (span_z * 0.8 + buffer) * score_factor)
            
            return {
                'center_x': center_x,
                'center_y': center_y,
                'center_z': center_z,
                'size_x': size_x,
                'size_y': size_y,
                'size_z': size_z
            }
        
        # Default adaptive box size
        base_size = 18.0 + buffer
        return {
            'center_x': center_x,
            'center_y': center_y,
            'center_z': center_z,
            'size_x': base_size,
            'size_y': base_size,
            'size_z': base_size
        }
    
    def get_docking_parameters(self, pdb_path: str, site_rank: int = 1, 
                             buffer: float = 5.0, min_size: float = 15.0) -> Dict[str, float]:
        """
        Get optimized docking parameters for a specific binding site.
        
        Args:
            pdb_path: Path to the PDB file
            site_rank: Rank of the binding site to use (1 = top site)
            buffer: Buffer distance around pocket atoms
            min_size: Minimum box size
            
        Returns:
            Dictionary with docking parameters ready for AutoDock Vina
        """
        # Find the CSV file in the results
        pdb_filename = Path(pdb_path).stem
        predictions_csv = os.path.join(self.base_result_path, pdb_filename, f"{pdb_filename}.pdb_predictions.csv")
        
        if not os.path.exists(predictions_csv):
            raise FileNotFoundError(f"P2Rank predictions not found: {predictions_csv}")
        
        # Get binding sites
        binding_sites = self.parse_predictions_csv(predictions_csv)
        
        if not binding_sites:
            raise ValueError("No binding sites found in predictions")
        
        if site_rank > len(binding_sites):
            raise ValueError(f"Site rank {site_rank} not available. Only {len(binding_sites)} sites found.")
        
        # Get the specified binding site (rank is 1-based, list is 0-based)
        target_site = binding_sites[site_rank - 1]
        
        # Calculate optimal box
        box_params = self.calculate_docking_box(pdb_path, target_site, buffer, min_size)
        
        # Add additional metadata
        box_params['binding_site_rank'] = site_rank
        box_params['binding_site_score'] = target_site.get('score', 0)
        box_params['binding_site_name'] = target_site.get('name', f"site_{site_rank}")
        
        return box_params

# Convenience functions for backward compatibility
def run_p2rank(pdb_path: str, base_result_path: str = 'p2rank_2.5\\results') -> Dict[str, Any]:
    """
    Convenience function to run P2Rank prediction.
    
    Args:
        pdb_path: Path to the input PDB file
        base_result_path: Base directory for storing results
        
    Returns:
        Dictionary containing prediction results
    """
    tool = PrankTool(base_result_path=base_result_path)
    return tool.predict_binding_sites(pdb_path)

def get_binding_site_center(p2rank_result_csv: str) -> Tuple[float, float, float]:
    """
    Convenience function to get the center coordinates of the top binding site.
    
    Args:
        p2rank_result_csv: Path to the P2Rank predictions CSV file
        
    Returns:
        Tuple containing (x, y, z) coordinates of the top binding site
    """
    tool = PrankTool()
    top_site = tool.get_top_binding_site(p2rank_result_csv)
    return (top_site['center_x'], top_site['center_y'], top_site['center_z'])

def get_all_binding_sites(p2rank_result_csv: str) -> List[Dict[str, Any]]:
    """
    Convenience function to get all binding sites with their scores and coordinates.
    
    Args:
        p2rank_result_csv: Path to the P2Rank predictions CSV file
        
    Returns:
        List of all binding sites with complete information
    """
    tool = PrankTool()
    return tool.parse_predictions_csv(p2rank_result_csv)