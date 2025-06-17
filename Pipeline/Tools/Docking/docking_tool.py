import subprocess
import os
import platform
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
from meeko import MoleculePreparation, PDBQTWriterLegacy as PDBQTWriter
import uuid
import re

class DockingTool:
    def __init__(self):
        # Platform-specific paths
        self._set_platform_paths()
        
        self.static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'docking_results')
        os.makedirs(self.static_dir, exist_ok=True)

    def _set_platform_paths(self):
        """Set platform-specific paths for docking tools."""
        if platform.system() == "Windows":
            self.mgltools_python_path = os.path.join("Tools","Docking","Util","MGLTools-1.5.7","python.exe")
            self.prepare_receptor_script_path = os.path.join("Tools","Docking","Util","MGLTools-1.5.7","Lib","site-packages","AutoDockTools","Utilities24","prepare_receptor4.py")
            self.vina_executable = os.path.join("Tools","Docking","Util","vina.exe")
        else:
            # Linux/Mac paths
            self.mgltools_python_path = os.path.join("Tools","Docking","Util","Linux","mgltools_x86_64Linux2_1.5.7","Python2.7_x86_64Linux2","bin","MGLpython2.7")
            self.prepare_receptor_script_path = os.path.join("Tools","Docking","Util","Linux","mgltools_x86_64Linux2_1.5.7","MGLToolsPckgs","MGLToolsPckgs","AutoDockTools","Utilities24","prepare_receptor4.py")
            self.vina_executable = os.path.join("Tools","Docking","Util","Linux","vina_1.2.7_linux_x86_64")

    def _check_executable_permissions(self, executable_path):
        """Check if an executable exists and has proper permissions."""
        path_obj = Path(executable_path)
        
        if not path_obj.exists():
            return False, f"Executable not found at {executable_path}"
        
        if not os.access(str(path_obj), os.X_OK):
            return False, f"Executable is not executable at {executable_path}. Run: chmod +x {executable_path}"
        
        return True, "Executable is ready"

    def prepare_protein_pdbqt(self, protein_pdb_file, output_pdbqt_file, extra_options=None):
        """Prepares a protein PDB file into PDBQT format using MGLTools' prepare_receptor4.py."""
        protein_pdb_path = Path(protein_pdb_file)
        mgltools_python_path_obj = Path(self.mgltools_python_path)
        prepare_receptor_script_path_obj = Path(self.prepare_receptor_script_path)
        output_pdbqt_path = Path(output_pdbqt_file)

        # Check executable permissions
        executable_ok, executable_msg = self._check_executable_permissions(self.mgltools_python_path)
        if not executable_ok:
            return {"success": False, "error": executable_msg}

        if not prepare_receptor_script_path_obj.exists():
            return {"success": False, "error": f"prepare_receptor4.py script not found at {prepare_receptor_script_path_obj}"}
        if not protein_pdb_path.exists():
            return {"success": False, "error": f"Protein PDB file not found at {protein_pdb_path}"}

        # Create a cleaned version of the PDB file
        cleaned_pdb_path = protein_pdb_path.with_suffix('.cleaned.pdb')
        clean_success, clean_msg = self._clean_pdb_file(str(protein_pdb_path), str(cleaned_pdb_path))
        if not clean_success:
            return {"success": False, "error": f"Failed to clean PDB file: {clean_msg}"}

        try:
            # Try multiple preparation strategies
            strategies = [
                # Strategy 1: Default with hydrogen checking
                {'A': 'checkhydrogens', 'U': 'nphs_lps_waters_delete'},
                # Strategy 2: Skip hydrogen addition, just delete waters
                {'A': 'None', 'U': 'nphs_lps_waters_delete'},
                # Strategy 3: Add polar hydrogens only
                {'A': 'add_polarH', 'U': 'nphs_lps_waters_delete'},
                # Strategy 4: Minimal processing
                {'U': 'nphs_lps_waters_delete'}
            ]
            
            # Override with user-provided options if specified
            if extra_options:
                strategies = [extra_options] + strategies
            
            last_error = None
            
            for i, strategy in enumerate(strategies):
                try:
                    command = [
                        str(mgltools_python_path_obj),
                        str(prepare_receptor_script_path_obj),
                        "-r", str(cleaned_pdb_path),  # Use cleaned PDB file
                        "-o", str(output_pdbqt_path),
                        "-v"
                    ]

                    for opt, val in strategy.items():
                        if val is not None and val != 'None':
                            command.extend([f"-{opt}", str(val)])
                        elif val != 'None':  # Only add option flag if value is not 'None'
                            command.extend([f"-{opt}"])

                    # Get proper environment with library paths
                    env = self._get_mgltools_env()
                    process = subprocess.run(command, check=True, capture_output=True, text=True, 
                                           encoding='utf-8', errors='replace', env=env)
                    
                    # If we get here, the command succeeded
                    strategy_name = f"Strategy {i+1}" if not extra_options or i > 0 else "User-specified"
                    return {
                        "success": True, 
                        "message": f"Protein PDBQT preparation successful using {strategy_name}",
                        "strategy_used": strategy
                    }
                    
                except subprocess.CalledProcessError as e:
                    last_error = f"Strategy {i+1} failed: {e.stderr}"
                    continue
                except Exception as e:
                    last_error = f"Strategy {i+1} failed with unexpected error: {str(e)}"
                    continue
            
            # If all strategies failed
            return {
                "success": False, 
                "error": f"All preparation strategies failed. Last error: {last_error}"
            }
        
        finally:
            # Clean up the temporary cleaned PDB file
            try:
                if cleaned_pdb_path.exists():
                    cleaned_pdb_path.unlink()
            except:
                pass  # Ignore cleanup errors

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

        # Check executable permissions
        executable_ok, executable_msg = self._check_executable_permissions(self.vina_executable)
        if not executable_ok:
            return {"success": False, "error": executable_msg}

        if not config_abs_path.exists():
            return {"success": False, "error": f"Config file not found at {config_abs_path}"}

        command = [
            str(vina_executable_path),
            "--config", str(config_abs_path),
            "--out", str(output_pdbqt_abs_path)
        ]

        try:
            # Run Vina and capture output
            process = subprocess.run(command, check=True, capture_output=True, text=True, 
                                   encoding='utf-8', errors='replace')
            
            # Write the captured output to the log file
            # Vina typically outputs results to stdout
            with open(output_log_abs_path, 'w') as log_file:
                log_file.write("=== AutoDock Vina Output ===\n")
                log_file.write("STDOUT:\n")
                log_file.write(process.stdout)
                log_file.write("\nSTDERR:\n")
                log_file.write(process.stderr)
            
            return {"success": True, "message": "AutoDock Vina run successful"}
        except subprocess.CalledProcessError as e:
            # Even if Vina fails, we want to capture the output for debugging
            try:
                with open(output_log_abs_path, 'w') as log_file:
                    log_file.write("=== AutoDock Vina Error Output ===\n")
                    log_file.write("STDOUT:\n")
                    log_file.write(e.stdout if e.stdout else "No stdout")
                    log_file.write("\nSTDERR:\n")
                    log_file.write(e.stderr if e.stderr else "No stderr")
            except:
                pass  # Ignore log writing errors
            
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

    def _get_mgltools_env(self):
        """Get environment variables needed for MGLTools execution."""
        env = os.environ.copy()
        
        if platform.system() != "Windows":
            # Add MGLTools library paths to LD_LIBRARY_PATH
            mgltools_base = os.path.join("Tools", "Docking", "Util", "Linux", "mgltools_x86_64Linux2_1.5.7")
            lib_paths = [
                os.path.join(mgltools_base, "Python2.7_x86_64Linux2", "lib"),
                os.path.join(mgltools_base, "lib")
            ]
            
            # Convert to absolute paths
            abs_lib_paths = [os.path.abspath(path) for path in lib_paths]
            
            current_ld_path = env.get('LD_LIBRARY_PATH', '')
            if current_ld_path:
                new_ld_path = ':'.join(abs_lib_paths) + ':' + current_ld_path
            else:
                new_ld_path = ':'.join(abs_lib_paths)
            
            env['LD_LIBRARY_PATH'] = new_ld_path
            
            # Add MGLTools Python packages to PYTHONPATH
            python_paths = [
                os.path.abspath(os.path.join(mgltools_base, "MGLToolsPckgs", "MGLToolsPckgs")),
                os.path.abspath(os.path.join(mgltools_base, "ThirdPartyPacks", "lib", "python2.7", "site-packages")),
                os.path.abspath(os.path.join(mgltools_base, "Python2.7_x86_64Linux2", "lib", "python2.7")),
                os.path.abspath(os.path.join(mgltools_base, "Python2.7_x86_64Linux2", "lib", "python2.7", "lib-dynload")),
                os.path.abspath(os.path.join(mgltools_base, "Python2.7_x86_64Linux2", "lib", "python2.7", "site-packages"))
            ]
            
            current_python_path = env.get('PYTHONPATH', '')
            if current_python_path:
                new_python_path = ':'.join(python_paths) + ':' + current_python_path
            else:
                new_python_path = ':'.join(python_paths)
            
            env['PYTHONPATH'] = new_python_path
        
        return env

    def _clean_pdb_file(self, input_pdb_path, output_pdb_path):
        """Clean PDB file to fix common formatting issues that cause MGLTools parsing errors."""
        try:
            with open(input_pdb_path, 'r') as infile:
                lines = infile.readlines()
            
            cleaned_lines = []
            model_count = 0
            
            for line in lines:
                # Skip empty lines
                if not line.strip():
                    continue
                
                # Handle MODEL lines
                if line.startswith('MODEL'):
                    model_count += 1
                    # Ensure proper MODEL line format
                    cleaned_lines.append(f"MODEL     {model_count:<4s}\n")
                    continue
                
                # Handle ATOM and HETATM lines
                if line.startswith(('ATOM  ', 'HETATM')):
                    # Ensure line is properly formatted and not truncated
                    if len(line.rstrip()) >= 54:  # Minimum length for coordinate data
                        cleaned_lines.append(line)
                    continue
                
                # Keep other important lines
                if line.startswith(('HEADER', 'TITLE', 'COMPND', 'SOURCE', 'REMARK', 
                                   'SEQRES', 'HELIX', 'SHEET', 'CONECT', 'END')):
                    cleaned_lines.append(line)
            
            # Write cleaned file
            with open(output_pdb_path, 'w') as outfile:
                outfile.writelines(cleaned_lines)
            
            return True, "PDB file cleaned successfully"
            
        except Exception as e:
            return False, f"Error cleaning PDB file: {str(e)}"