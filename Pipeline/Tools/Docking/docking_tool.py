import subprocess
import os
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
from meeko import MoleculePreparation, PDBQTWriterLegacy as PDBQTWriter

class DockingTool:
    def __init__(self):
        # Default paths - these should be configured based on your system setup
        self.mgltools_python_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                                "Util","MGLTools-1.5.7", "python.exe")
        self.prepare_receptor_script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                                                       "Util","MGLTools-1.5.7", "Lib", "site-packages", 
                                                       "AutoDockTools", "Utilities24", "prepare_receptor4.py")
        self.vina_executable = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                          "Util","vina.exe")

    def prepare_protein_pdbqt(self, protein_pdb_file, output_pdbqt_file, extra_options=None):
        """Prepares a protein PDB file into PDBQT format using MGLTools' prepare_receptor4.py."""
        protein_pdb_path = Path(protein_pdb_file)
        mgltools_python_path_obj = Path(self.mgltools_python_path)
        prepare_receptor_script_path_obj = Path(self.prepare_receptor_script_path)
        output_pdbqt_path = Path(output_pdbqt_file)

        if not mgltools_python_path_obj.exists():
            return {"success": False, "error": f"MGLTools Python interpreter not found at {mgltools_python_path_obj}"}
        if not prepare_receptor_script_path_obj.exists():
            return {"success": False, "error": f"prepare_receptor4.py script not found at {prepare_receptor_script_path_obj}"}
        if not protein_pdb_path.exists():
            return {"success": False, "error": f"Protein PDB file not found at {protein_pdb_path}"}

        command = [
            str(mgltools_python_path_obj),
            str(prepare_receptor_script_path_obj),
            "-r", str(protein_pdb_path),
            "-o", str(output_pdbqt_path),
            "-v"
        ]

        default_options = {'A': 'checkhydrogens', 'U': 'nphs_lps_waters_delete'}
        current_options = default_options.copy()
        if extra_options:
            current_options.update(extra_options)

        for opt, val in current_options.items():
            if val is not None:
                command.extend([f"-{opt}", str(val)])
            else:
                command.extend([f"-{opt}"])

        try:
            process = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
            return {"success": True, "message": "Protein PDBQT preparation successful"}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Error during protein PDBQT preparation: {e.stderr}"}
        except Exception as e:
            return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

    def prepare_ligand_pdbqt_meeko(self, ligand_file, output_pdbqt_file, keep_source_hydrogens=False, add_hydrogens_ph=None):
        """Prepares a ligand (SDF or PDB) into PDBQT format using Meeko."""
        ligand_path = Path(ligand_file)
        output_pdbqt_path = Path(output_pdbqt_file)

        if not ligand_path.exists():
            return {"success": False, "error": f"Ligand file not found at {ligand_path}"}

        try:
            mol = None
            if ligand_path.suffix.lower() == ".sdf":
                suppl = Chem.SDMolSupplier(str(ligand_path))
                mol = next(suppl)
            elif ligand_path.suffix.lower() == ".pdb":
                mol = Chem.MolFromPDBFile(str(ligand_path), removeHs=not keep_source_hydrogens)
            else:
                mol = Chem.MolFromMolFile(str(ligand_path), removeHs=not keep_source_hydrogens)

            if mol is None:
                return {"success": False, "error": f"RDKit could not parse the ligand file: {ligand_file}"}

            if add_hydrogens_ph is not None:
                mol = AllChem.AddHs(mol, pH=add_hydrogens_ph, addCoords=True)
            elif not keep_source_hydrogens:
                mol = AllChem.AddHs(mol, addCoords=True)

            preparator = MoleculePreparation()
            mol_setups = preparator.prepare(mol)

            if isinstance(mol_setups, list):
                if not mol_setups:
                    return {"success": False, "error": "Meeko returned an empty list of molecule setups"}
                mol_setup = mol_setups[0]
            else:
                mol_setup = mol_setups

            pdbqt_output = PDBQTWriter.write_string(mol_setup)
            if isinstance(pdbqt_output, tuple):
                pdbqt_string = pdbqt_output[0]
            else:
                pdbqt_string = pdbqt_output

            with open(output_pdbqt_path, "w") as f:
                f.write(pdbqt_string)

            return {"success": True, "message": "Ligand PDBQT preparation successful"}

        except Exception as e:
            return {"success": False, "error": f"Error during ligand PDBQT preparation: {str(e)}"}

    def create_vina_config(self, receptor_pdbqt_file, ligand_pdbqt_file, center_x, center_y, center_z,
                          size_x, size_y, size_z, config_file_path, exhaustiveness=8, num_modes=9, 
                          energy_range=3, seed=None, cpu=1):
        """Creates a Vina configuration file."""
        receptor_pdbqt_abs_path = Path(receptor_pdbqt_file).resolve()
        ligand_pdbqt_abs_path = Path(ligand_pdbqt_file).resolve()
        config_file_path_obj = Path(config_file_path)

        config_content = f"""
            receptor = {receptor_pdbqt_abs_path}
            ligand = {ligand_pdbqt_abs_path}

            center_x = {center_x}
            center_y = {center_y}
            center_z = {center_z}

            size_x = {size_x}
            size_y = {size_y}
            size_z = {size_z}

            exhaustiveness = {exhaustiveness}
            num_modes = {num_modes}
            energy_range = {energy_range}
            cpu = {cpu}
        """
        
        if seed is not None:
            config_content += f"seed = {seed}\n"

        try:
            with open(config_file_path_obj, "w") as f:
                f.write(config_content)
            return {"success": True, "config_path": str(config_file_path_obj)}
        except Exception as e:
            return {"success": False, "error": f"Error creating Vina configuration file: {str(e)}"}

    def run_autodock_vina(self, output_pdbqt_file, output_log_file, config_file):
        """Runs AutoDock Vina using the subprocess module."""
        output_pdbqt_abs_path = Path(output_pdbqt_file).resolve()
        output_log_abs_path = Path(output_log_file).resolve()
        config_abs_path = Path(config_file).resolve()
        vina_executable_path = Path(self.vina_executable)

        if not vina_executable_path.exists():
            return {"success": False, "error": f"Vina executable not found at {vina_executable_path}"}

        command = [
            str(vina_executable_path),
            "--config", str(config_abs_path),
            "--out", str(output_pdbqt_abs_path),
            "--log", str(output_log_abs_path)
        ]

        try:
            process = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
            return {"success": True, "message": "AutoDock Vina run successful"}
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Error running AutoDock Vina: {e.stderr}"}
        except Exception as e:
            return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

    def perform_docking(self, protein_file, ligand_file, output_dir, center_x, center_y, center_z,
                       size_x, size_y, size_z, exhaustiveness=8, num_modes=9, cpu=1):
        """Main function to perform the complete docking workflow."""
        try:
            # Create output directory if it doesn't exist
            output_dir_path = Path(output_dir)
            output_dir_path.mkdir(parents=True, exist_ok=True)

            # Prepare file paths
            protein_pdbqt = output_dir_path / f"{Path(protein_file).stem}_prepared.pdbqt"
            ligand_pdbqt = output_dir_path / f"{Path(ligand_file).stem}_prepared.pdbqt"
            config_file = output_dir_path / "config.txt"
            output_poses = output_dir_path / f"{Path(protein_file).stem}_{Path(ligand_file).stem}_docked_poses.pdbqt"
            output_log = output_dir_path / f"{Path(protein_file).stem}_{Path(ligand_file).stem}_vina_log.txt"

            # Step 1: Prepare protein
            protein_result = self.prepare_protein_pdbqt(protein_file, str(protein_pdbqt))
            if not protein_result["success"]:
                return protein_result

            # Step 2: Prepare ligand
            ligand_result = self.prepare_ligand_pdbqt_meeko(ligand_file, str(ligand_pdbqt))
            if not ligand_result["success"]:
                return ligand_result

            # Step 3: Create Vina configuration
            config_result = self.create_vina_config(
                str(protein_pdbqt),
                str(ligand_pdbqt),
                center_x, center_y, center_z,
                size_x, size_y, size_z,
                str(config_file),
                exhaustiveness=exhaustiveness,
                num_modes=num_modes,
                cpu=cpu
            )
            if not config_result["success"]:
                return config_result

            # Step 4: Run AutoDock Vina
            vina_result = self.run_autodock_vina(str(output_poses), str(output_log), str(config_file))
            if not vina_result["success"]:
                return vina_result

            return {
                "success": True,
                "message": "Docking completed successfully",
                "output_files": {
                    "protein_pdbqt": str(protein_pdbqt),
                    "ligand_pdbqt": str(ligand_pdbqt),
                    "docked_poses": str(output_poses),
                    "log_file": str(output_log)
                }
            }

        except Exception as e:
            return {"success": False, "error": f"An unexpected error occurred during docking: {str(e)}"} 