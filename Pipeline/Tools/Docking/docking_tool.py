import subprocess
import os
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
from meeko import MoleculePreparation, PDBQTWriterLegacy as PDBQTWriter
import uuid
import re

class DockingTool:
    def __init__(self):
        # Linux paths
        # prepare_receptor_script_path = "C:\Users\saleh\source\repos\Grad2-Protein-MultiAgent-System\Pipeline\Tools\Docking\Util\Linux\mgltools_x86_64Linux2_1.5.7\MGLToolsPckgs\MGLToolsPckgs\AutoDockTools\Utilities24\prepare_receptor4.py"

        self.mgltools_python_path = os.path.join("Tools","Docking","Util","Linux","mgltools_x86_64Linux2_1.5.7","Python2.7_x86_64Linux2","bin","MGLpython2.7")
        self.prepare_receptor_script_path = os.path.join("Tools","Docking","Util","Linux","mgltools_x86_64Linux2_1.5.7","MGLToolsPckgs","MGLToolsPckgs","AutoDockTools","Utilities24","prepare_receptor4.py")
        self.vina_executable = os.path.join("Tools","Docking","Util","Linux","vina_1.2.7_linux_x86_64")
        if os.name=='nt':
            self.mgltools_python_path = os.path.join("Tools","Docking","Util","MGLTools-1.5.7","python.exe")
            self.prepare_receptor_script_path = os.path.join("Tools","Docking","Util","MGLTools-1.5.7","Lib","site-packages","AutoDockTools","Utilities24","prepare_receptor4.py")
            self.vina_executable = os.path.join("Tools","Docking","Util","vina.exe")

        self.static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'docking_results')
        os.makedirs(self.static_dir, exist_ok=True)

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
                          size_x, size_y, size_z, config_file_path, exhaustiveness=16, num_modes=10, 
                          energy_range=3, seed=None, cpu=4):
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

    def _parse_vina_log(self, log_file_path):
        """Parses a Vina log file to extract scores for each mode."""
        modes = []
        try:
            with open(log_file_path, 'r') as f:
                log_content = f.read()

            # Regex to find the table of results
            # Adjust regex if your Vina output format is different
            # This regex captures mode, affinity, rmsd_lb, and rmsd_ub
            matches = re.findall(r"\s*(\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)", log_content)

            for match in matches:
                modes.append({
                    "mode": int(match[0]),
                    "affinity": float(match[1]),
                    "rmsd_lb": float(match[2]),
                    "rmsd_ub": float(match[3]),
                })
        except Exception as e:
            print(f"Error parsing Vina log file {log_file_path}: {e}")
            # Return empty list or raise error, depending on desired handling
        return modes

    def split_pdbqt_to_pdb(self, vina_output_pdbqt, protein_pdb_file, output_dir, output_prefix="docked_complex_mode"):
        """
        Splits a Vina PDBQT output file into separate PDB files for each ligand model,
        and combines each with the protein to form a complex PDB.
        Returns a tuple: (list_of_complex_pdb_paths, list_of_ligand_pdb_paths)
        """
        vina_output_path = Path(vina_output_pdbqt)
        protein_pdb_path = Path(protein_pdb_file)
        output_dir_path = Path(output_dir)

        if not vina_output_path.exists():
            print(f"Warning: Vina output PDBQT not found at {vina_output_path}. Cannot split.")
            return [], []
        if not protein_pdb_path.exists():
            print(f"Warning: Original protein PDB not found at {protein_pdb_path}. Complex PDBs will not be generated.")
            return [], []

        model_counter = 0
        current_ligand_model_lines = []
        output_complex_files = []
        output_ligand_files = [] # New list for individual ligand PDBs

        protein_lines = []
        try:
            with open(protein_pdb_path, 'r') as f_prot:
                for line in f_prot:
                    if line.startswith(("ATOM", "HETATM", "TER")):
                        protein_lines.append(line)
        except Exception as e:
            print(f"Error reading protein PDB file {protein_pdb_path}: {e}")
            return [], []


        try:
            with open(vina_output_path, 'r') as f_in:
                for line in f_in:
                    if line.startswith("MODEL"):
                        current_ligand_model_lines = []
                        model_counter += 1
                    elif line.startswith("ENDMDL"):
                        if current_ligand_model_lines:
                            # Create individual ligand PDB
                            ligand_pdb_name = output_dir_path / f"{Path(output_prefix).stem}_ligand_mode_{model_counter}.pdb"
                            with open(ligand_pdb_name, 'w') as f_lig_out:
                                for l_line in current_ligand_model_lines:
                                    # PDB format uses ATOM or HETATM for coordinates
                                    if l_line.startswith(("ATOM", "HETATM")):
                                        # Ensure the line is formatted correctly for PDB (e.g., remove PDBQT specific charge info if present)
                                        # This is a simplified conversion; robust PDBQT to PDB might need more specific parsing
                                        f_lig_out.write(l_line[:66] + "\n") # Keep essential atom info
                                    elif l_line.startswith("CONECT"):
                                         f_lig_out.write(l_line)
                                f_lig_out.write("END\n")
                            output_ligand_files.append(str(ligand_pdb_name))

                            # Create complex PDB
                            complex_pdb_name = output_dir_path / f"{output_prefix}_complex_mode_{model_counter}.pdb"
                            with open(complex_pdb_name, 'w') as f_comp_out:
                                f_comp_out.writelines(protein_lines)
                                f_comp_out.write("TER\n") # Separator between protein and ligand
                                for l_line in current_ligand_model_lines:
                                    if l_line.startswith(("ATOM", "HETATM")):
                                         f_comp_out.write(l_line[:66] + "\n")
                                    elif l_line.startswith("CONECT"): # Include CONECT records if present for ligand
                                        f_comp_out.write(l_line)
                                f_comp_out.write("END\n")
                            output_complex_files.append(str(complex_pdb_name))
                            current_ligand_model_lines = []
                    elif line.startswith(("ATOM", "HETATM", "CONECT")): # Collect relevant lines for ligand
                        current_ligand_model_lines.append(line)
        except Exception as e:
            print(f"Error processing Vina PDBQT file {vina_output_path}: {e}")
            return [], []
            
        if not output_complex_files:
            print(f"Warning: No models found or processed in {vina_output_pdbqt}.")
        
        return output_complex_files, output_ligand_files

    def perform_docking(self, protein_file, ligand_file, center_x, center_y, center_z,
                       size_x, size_y, size_z, exhaustiveness=16, num_modes=10, cpu=4):
        """Main function to perform the complete docking workflow."""
        try:
            # Create a unique subfolder for this job
            job_id = str(uuid.uuid4())
            base_output_dir = Path(self.static_dir)
            output_dir_path = base_output_dir / job_id
            output_dir_path.mkdir(parents=True, exist_ok=True)

            # Prepare file paths with shorter, user-friendly names
            protein_file_path = Path(protein_file) # Keep original path for reading
            ligand_file_path = Path(ligand_file)   # Keep original path for reading

            protein_pdbqt = output_dir_path / "protein_prepared.pdbqt"
            ligand_pdbqt = output_dir_path / "ligand_prepared.pdbqt"
            config_file = output_dir_path / "vina_config.txt"
            all_poses_pdbqt = output_dir_path / "docking_all_poses.pdbqt"
            output_log = output_dir_path / "docking_vina_log.txt"

            # Step 1: Prepare protein
            protein_result = self.prepare_protein_pdbqt(str(protein_file_path), str(protein_pdbqt))
            if not protein_result["success"]:
                return protein_result

            # Step 2: Prepare ligand
            ligand_result = self.prepare_ligand_pdbqt_meeko(str(ligand_file_path), str(ligand_pdbqt))
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
            vina_result = self.run_autodock_vina(str(all_poses_pdbqt), str(output_log), str(config_file))
            if not vina_result["success"]:
                return vina_result

            # Step 5: Parse Vina log for scores
            parsed_scores = self._parse_vina_log(str(output_log))

            # Step 6: Split PDBQT into individual PDBs and complexes
            # Use a simpler, generic prefix for split files
            split_prefix = "docking_pose" 
            complex_pdb_files, ligand_pdb_files = self.split_pdbqt_to_pdb(
                str(all_poses_pdbqt),
                str(protein_file_path), # Still need original protein for complex generation
                str(output_dir_path),
                output_prefix=split_prefix
            )

            # Step 7: Combine scores with file paths
            docking_poses_info = []
            for score_data in parsed_scores:
                mode_num = score_data["mode"]
                complex_file = next((cf for cf in complex_pdb_files if f"_complex_mode_{mode_num}.pdb" in cf), None)
                ligand_file_split = next((lf for lf in ligand_pdb_files if f"_ligand_mode_{mode_num}.pdb" in lf), None)

                if complex_file and ligand_file_split: 
                    docking_poses_info.append({
                        "mode": mode_num,
                        "affinity": score_data["affinity"],
                        "rmsd_lb": score_data["rmsd_lb"],
                        "rmsd_ub": score_data["rmsd_ub"],
                        "complex_pdb_file": str(complex_file),
                        "ligand_pdb_file": str(ligand_file_split)
                    })
                else:
                    print(f"Warning: Could not find PDB files for mode {mode_num}")

            return {
                "success": True,
                "message": "Docking completed successfully.",
                "output_dir": str(output_dir_path),
                "output_files": {
                    "protein_pdbqt": str(protein_pdbqt),
                    "ligand_pdbqt": str(ligand_pdbqt),
                    "all_poses_pdbqt": str(all_poses_pdbqt),
                    "log_file": str(output_log),
                    "config_file": str(config_file),
                },
                "docking_poses": docking_poses_info
            }

        except Exception as e:
            import traceback
            print(f"An unexpected error occurred during docking: {str(e)}\n{traceback.format_exc()}")
            return {"success": False, "error": f"An unexpected error occurred during docking: {str(e)}"} 