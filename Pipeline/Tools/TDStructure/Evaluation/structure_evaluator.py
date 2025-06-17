from typing import Dict, Any
import subprocess
import os
import re
import platform

class StructureEvaluator:
    
    def _get_usalign_path(self) -> str:
        """Get the correct USalign executable path based on the current OS."""
        base_dir = os.path.dirname(__file__)
        if platform.system() == "Windows":
            return os.path.join(base_dir, 'USalign.exe')
        else:
            # Linux/Mac path
            return os.path.join(base_dir, 'USalign')
    
    def evaluate_with_usalign(self, pdb1_path: str, pdb2_path: str) -> Dict[str, Any]:
        """Evaluate structural similarity using USalign.
        
        Args:
            pdb1_path (str): Path to the first PDB file
            pdb2_path (str): Path to the second PDB file
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if evaluation was successful
                - tm_score: TM-score value
                - rmsd: RMSD value
                - aligned_length: Number of aligned residues
                - seq_id: Sequence identity
                - error: Error message if unsuccessful
        """
        try:
            # Get the absolute path to USalign executable
            usalign_path = self._get_usalign_path()
            
            if not os.path.exists(usalign_path):
                print(f"USalign executable not found at {usalign_path}")
                return {"success": False, "error": "USalign executable not found"}
            
            # Check if the executable has proper permissions (important for Linux)
            if not os.access(usalign_path, os.X_OK):
                print(f"USalign is not executable at {usalign_path}")
                return {"success": False, "error": "USalign is not executable"}
            
            # Run USalign
            result = subprocess.run(
                [usalign_path, pdb1_path, pdb2_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return {"success": False, "error": f"USalign failed: {result.stderr}"}
            
            # Parse the output
            output = result.stdout
            
            # Extract metrics using regex
            rmsd_match = re.search(r'RMSD=\s*([\d.]+)', output)
            tm_score_match = re.search(r'TM-score=\s*([\d.]+)\s*\(normalized by length of Structure_1', output)
            aligned_length_match = re.search(r'Aligned length=\s*(\d+)', output)
            seq_id_match = re.search(r'Seq_ID=n_identical/n_aligned=\s*([\d.]+)', output)
            
            if not all([rmsd_match, tm_score_match, aligned_length_match, seq_id_match]):
                return {"success": False, "error": "Failed to parse USalign output"}
            
            return {
                "success": True,
                "tm_score": float(tm_score_match.group(1)),
                "rmsd": float(rmsd_match.group(1)),
                "aligned_length": int(aligned_length_match.group(1)),
                "seq_id": float(seq_id_match.group(1))
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
