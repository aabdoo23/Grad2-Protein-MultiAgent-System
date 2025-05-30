import subprocess
import os
import argparse
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
from meeko import MoleculePreparation, PDBQTWriterLegacy as PDBQTWriter


def prepare_protein_pdbqt(protein_pdb_file, output_pdbqt_file, mgltools_python_path, prepare_receptor_script_path, extra_options=None):
    """
    Prepares a protein PDB file into PDBQT format using MGLTools' prepare_receptor4.py.

    Args:
        protein_pdb_file (str): Path to the input protein PDB file.
        output_pdbqt_file (str): Path for the output protein PDBQT file.
        mgltools_python_path (str): Path to the MGLTools pythonsh interpreter.
        prepare_receptor_script_path (str): Path to the prepare_receptor4.py script.
        extra_options (dict, optional): Extra options for prepare_receptor4.py.
    Returns:
        bool: True if successful, False otherwise.
    """
    protein_pdb_path = Path(protein_pdb_file)
    mgltools_python_path_obj = Path(mgltools_python_path)
    prepare_receptor_script_path_obj = Path(prepare_receptor_script_path)
    output_pdbqt_path = Path(output_pdbqt_file)

    if not mgltools_python_path_obj.exists():
        print(f"Error: MGLTools Python interpreter not found at {mgltools_python_path_obj}")
        print("Please ensure the path is correct and MGLTools is installed.")
        return False
    if not prepare_receptor_script_path_obj.exists():
        print(f"Error: prepare_receptor4.py script not found at {prepare_receptor_script_path_obj}")
        print("Please ensure the path is correct and MGLTools is installed.")
        return False
    if not protein_pdb_path.exists():
        print(f"Error: Protein PDB file not found at {protein_pdb_path}")
        return False

    command = [
        str(mgltools_python_path_obj),
        str(prepare_receptor_script_path_obj),
        "-r", str(protein_pdb_path),
        "-o", str(output_pdbqt_path),
        "-v"  # verbose
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

    print(f"Preparing protein receptor with command: {' '.join(command)}")
    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        print("Protein PDBQT preparation successful!")
        if process.stdout:
            print("MGLTools Output:\n", process.stdout)
        if process.stderr:
            print("MGLTools Errors/Warnings (if any):\n", process.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error during protein PDBQT preparation: {e}")
        print("Stderr:", e.stderr)
        print("Stdout:", e.stdout)
        print("Please check MGLTools installation and input PDB file validity.")
        return False
    except FileNotFoundError:
        print(f"Error: MGLTools executable or script was not found. Check paths: {mgltools_python_path_obj}, {prepare_receptor_script_path_obj}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred during protein preparation: {e}")
        return False

def prepare_ligand_pdbqt_meeko(ligand_file, output_pdbqt_file, keep_source_hydrogens=False, add_hydrogens_ph=None, verbose=False):
    """
    Prepares a ligand (SDF or PDB) into PDBQT format using Meeko.
    Updated for compatibility with Meeko 0.6.1.
    """
    ligand_path = Path(ligand_file)
    output_pdbqt_path = Path(output_pdbqt_file)

    if not ligand_path.exists():
        print(f"Error: Ligand file not found at {ligand_path}")
        return False

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
            print(f"Error: RDKit could not parse the ligand file: {ligand_file}")
            return False

        if add_hydrogens_ph is not None:
            mol = AllChem.AddHs(mol, pH=add_hydrogens_ph, addCoords=True)
        elif not keep_source_hydrogens:
            mol = AllChem.AddHs(mol, addCoords=True)

        # Initialize Meeko preparator
        preparator = MoleculePreparation()
        mol_setups = preparator.prepare(mol)

        # Handle case where prepare() returns a list
        if isinstance(mol_setups, list):
            if not mol_setups:
                print("Error: Meeko returned an empty list of molecule setups")
                return False
            mol_setup = mol_setups[0]  # Select the first molecule setup
            if len(mol_setups) > 1 and verbose:
                print(f"Warning: Meeko returned {len(mol_setups)} molecule setups; using the first one")
        else:
            mol_setup = mol_setups  # Single molecule setup

        # Use Meeko API for writing PDBQT, handle tuple output
        pdbqt_output = PDBQTWriter.write_string(mol_setup)
        # Check if output is a tuple and extract the string
        if isinstance(pdbqt_output, tuple):
            pdbqt_string = pdbqt_output[0]  # First element is the PDBQT string
        else:
            pdbqt_string = pdbqt_output

        with open(output_pdbqt_path, "w") as f:
            f.write(pdbqt_string)

        if verbose:
            print(f"Ligand PDBQT preparation successful: {output_pdbqt_path}")
        return True

    except ImportError as e:
        if "rdkit" in str(e).lower():
            print("Error: RDKit is required but not found. Please install it: pip install rdkit")
        else:
            print(f"Import error: {e}")
        return False
    except AttributeError as e:
        print(f"Error: Meeko API incompatibility detected: {e}")
        print("Please ensure you have a compatible Meeko version installed (e.g., pip install meeko==0.6.1)")
        return False
    except Exception as e:
        print(f"Error during ligand PDBQT preparation: {e}")
        return False
    
def create_vina_config(receptor_pdbqt_file, ligand_pdbqt_file, center_x, center_y, center_z,
                       size_x, size_y, size_z, config_file_path="config.txt",
                       exhaustiveness=8, num_modes=9, energy_range=3, seed=None, cpu=1):
    """
    Creates a Vina configuration file.
    """
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
        print(f"Generated Vina configuration file: {config_file_path_obj}")
        return str(config_file_path_obj)
    except Exception as e:
        print(f"Error creating Vina configuration file {config_file_path_obj}: {e}")
        return None

def run_autodock_vina(output_pdbqt_file, output_log_file, config_file, vina_executable="vina.exe"):
    """
    Runs AutoDock Vina using the subprocess module.
    """
    output_pdbqt_abs_path = Path(output_pdbqt_file).resolve()
    output_log_abs_path = Path(output_log_file).resolve()
    config_abs_path = Path(config_file).resolve()

    command = [
        vina_executable,
        "--config", str(config_abs_path),
        "--out", str(output_pdbqt_abs_path),
        "--log", str(output_log_abs_path)
    ]

    print(f"Running AutoDock Vina with command: {' '.join(command)}")
    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        print("AutoDock Vina run successfully!")
        if process.stdout:
            print("Vina STDOUT:\n", process.stdout)
        if process.stderr:
            print("Vina STDERR/Warnings (if any):\n", process.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running AutoDock Vina: {e}")
        print("Vina Stderr:", e.stderr)
        print("Vina Stdout:", e.stdout)
        print(f"Please check Vina installation and ensure it can be run from the command line using '{vina_executable}'.")
        return False
    except FileNotFoundError:
        print(f"Error: The AutoDock Vina executable ('{vina_executable}') was not found.")
        print("Make sure it's in your system's PATH or provide the full path to the executable.")
        return False
    except Exception as e:
        print(f"An unexpected error occurred during Vina execution: {e}")
        return False

def split_pdbqt_to_pdb(vina_output_pdbqt, protein_pdb_file, output_dir, output_prefix="docked_complex_mode"):
    """
    Splits a Vina PDBQT output file into separate PDB files for each ligand model,
    and combines each with the protein to form a complex PDB.
    """
    vina_output_path = Path(vina_output_pdbqt)
    protein_pdb_path = Path(protein_pdb_file)
    output_dir_path = Path(output_dir)

    if not vina_output_path.exists():
        print(f"Warning: Vina output PDBQT not found at {vina_output_path}. Cannot split.")
        return []
    if not protein_pdb_path.exists():
        print(f"Warning: Original protein PDB not found at {protein_pdb_path}. Complex PDBs will not be generated.")
        return []

    model_counter = 0
    current_ligand_model_lines = []
    output_complex_files = []

    protein_lines = []
    with open(protein_pdb_path, 'r') as f_prot:
        for line in f_prot:
            if line.startswith(("ATOM", "HETATM", "TER")):
                protein_lines.append(line)

    with open(vina_output_path, 'r') as f_in:
        for line in f_in:
            if line.startswith("MODEL"):
                current_ligand_model_lines = []
                model_counter += 1
            elif line.startswith("ENDMDL"):
                if current_ligand_model_lines:
                    ligand_pdb_name = output_dir_path / f"{vina_output_path.stem}_ligand_mode_{model_counter}.pdb"
                    complex_pdb_name = output_dir_path / f"{output_prefix}_{model_counter}.pdb"

                    with open(ligand_pdb_name, 'w') as f_lig_out:
                        for l_line in current_ligand_model_lines:
                            if l_line.startswith(("HETATM", "ATOM", "CONECT")):
                                f_lig_out.write(l_line)
                        f_lig_out.write("END\n")

                    with open(complex_pdb_name, 'w') as f_comp_out:
                        f_comp_out.writelines(protein_lines)
                        f_comp_out.write("TER\n")
                        for l_line in current_ligand_model_lines:
                            if l_line.startswith(("HETATM", "ATOM", "CONECT")):
                                f_comp_out.write(l_line)
                        f_comp_out.write("END\n")

                    output_complex_files.append(str(complex_pdb_name))
                    current_ligand_model_lines = []
            elif line.startswith(("ATOM", "HETATM", "CONECT")):
                current_ligand_model_lines.append(line)

    if not output_complex_files:
        print(f"Warning: No models found or processed in {vina_output_pdbqt} to create complex PDBs.")
    else:
        print(f"Successfully created {len(output_complex_files)} complex PDB files in: {output_dir}")
        print("Individual ligand PDB files for each mode are also saved.")
    return output_complex_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Prepare inputs and run AutoDock Vina for molecular docking.",
        formatter_class=argparse.RawTextHelpFormatter
    )

    parser.add_argument("-p", "--protein", required=True, help="Path to the input protein PDB file.")
    parser.add_argument("-l", "--ligand", required=True, help="Path to the input ligand file (SDF, PDB, MOL, etc.).")
    parser.add_argument("-o", "--output_dir", default="vina_docking_output", help="Directory to save all output files.")
    parser.add_argument("--mgltools_python", required=True, help="Path to MGLTools pythonsh interpreter.")
    parser.add_argument("--prepare_receptor_script", required=True, help="Path to prepare_receptor4.py script.")
    parser.add_argument("--protein_prep_options", type=str, default="A:checkhydrogens,U:nphs_lps_waters_delete",
                        help="Extra options for prepare_receptor4.py as comma-separated key:value pairs.")
    parser.add_argument("--ligand_keep_hydrogens", action='store_true', help="Keep hydrogens from the input ligand file.")
    parser.add_argument("--ligand_protonation_ph", type=float, help="Specify pH for Meeko to protonate the ligand.")
    parser.add_argument("--center_x", required=True, type=float, help="X-coordinate of the search box center (Angstroms).")
    parser.add_argument("--center_y", required=True, type=float, help="Y-coordinate of the search box center (Angstroms).")
    parser.add_argument("--center_z", required=True, type=float, help="Z-coordinate of the search box center (Angstroms).")
    parser.add_argument("--size_x", required=True, type=float, help="Size of the search box in X dimension (Angstroms).")
    parser.add_argument("--size_y", required=True, type=float, help="Size of the search box in Y dimension (Angstroms).")
    parser.add_argument("--size_z", required=True, type=float, help="Size of the search box in Z dimension (Angstroms).")
    parser.add_argument("--vina_executable", default="vina.exe", help="Name or full path to the AutoDock Vina executable.")
    parser.add_argument("--exhaustiveness", type=int, default=8, help="Exhaustiveness of the Vina search.")
    parser.add_argument("--num_modes", type=int, default=9, help="Number of binding modes to generate.")
    parser.add_argument("--energy_range", type=int, default=3, help="Energy range (kcal/mol) for reported modes.")
    parser.add_argument("--seed", type=int, help="Random seed for Vina for reproducibility.")
    parser.add_argument("--cpu", type=int, default=1, help="Number of CPUs/threads for Vina to use.")

    args = parser.parse_args()

    output_dir_path = Path(args.output_dir)
    try:
        output_dir_path.mkdir(parents=True, exist_ok=True)
        print(f"Output directory created/ensured: {output_dir_path.resolve()}")
    except OSError as e:
        print(f"Error creating output directory {output_dir_path}: {e}")
        exit(1)

    protein_pdb_path = Path(args.protein)
    ligand_file_path = Path(args.ligand)
    protein_pdbqt_file = output_dir_path / f"{protein_pdb_path.stem}_prepared.pdbqt"
    ligand_pdbqt_file = output_dir_path / f"{ligand_file_path.stem}_prepared.pdbqt"
    vina_config_file = output_dir_path / "config.txt"
    vina_output_poses_pdbqt = output_dir_path / f"{protein_pdb_path.stem}_{ligand_file_path.stem}_docked_poses.pdbqt"
    vina_log_file = output_dir_path / f"{protein_pdb_path.stem}_{ligand_file_path.stem}_vina_log.txt"

    print("\n--- Step 1: Preparing Protein ---")
    protein_options_dict = {}
    if args.protein_prep_options:
        try:
            protein_options_dict = dict(item.split(":") for item in args.protein_prep_options.split(','))
        except ValueError:
            print(f"Error: Invalid format for --protein_prep_options. Use 'key1:value1,key2:value2'. Given: {args.protein_prep_options}")
            exit(1)

    if not prepare_protein_pdbqt(str(protein_pdb_path), str(protein_pdbqt_file),
                                 args.mgltools_python, args.prepare_receptor_script,
                                 extra_options=protein_options_dict):
        print("Protein preparation failed. Exiting.")
        exit(1)

    print("\n--- Step 2: Preparing Ligand ---")
    if not prepare_ligand_pdbqt_meeko(str(ligand_file_path), str(ligand_pdbqt_file),
                                      keep_source_hydrogens=args.ligand_keep_hydrogens,
                                      add_hydrogens_ph=args.ligand_protonation_ph,
                                      verbose=True):
        print("Ligand preparation failed. Exiting.")
        exit(1)

    print("\n--- Step 3: Creating Vina Configuration ---")
    config_path = create_vina_config(
        str(protein_pdbqt_file),
        str(ligand_pdbqt_file),
        args.center_x, args.center_y, args.center_z,
        args.size_x, args.size_y, args.size_z,
        config_file_path=str(vina_config_file),
        exhaustiveness=args.exhaustiveness,
        num_modes=args.num_modes,
        energy_range=args.energy_range,
        seed=args.seed,
        cpu=args.cpu
    )
    if not config_path:
        print("Vina configuration creation failed. Exiting.")
        exit(1)

    print("\n--- Step 4: Running AutoDock Vina ---")
    if not run_autodock_vina(str(vina_output_poses_pdbqt), str(vina_log_file), config_path, vina_executable=args.vina_executable):
        print("AutoDock Vina run failed. Exiting.")
        exit(1)

    print("\n--- Step 5: Processing Vina Output ---")
    if Path(vina_output_poses_pdbqt).exists():
        print(f"Docked poses (all in one PDBQT): {vina_output_poses_pdbqt}")
        print(f"Docking log (scores and stats): {vina_log_file}")
        split_pdbqt_to_pdb(str(vina_output_poses_pdbqt),
                           str(protein_pdb_path),
                           str(output_dir_path),
                           output_prefix=f"{protein_pdb_path.stem}_{ligand_file_path.stem}_complex_mode")
    else:
        print(f"Warning: Vina output PDBQT not found: {vina_output_poses_pdbqt}. Cannot split into individual PDBs.")
        print("This might indicate an issue with the Vina run itself.")

    print("\nScript finished successfully. Check the output directory for results.")
    print(f"All output files are saved in: {output_dir_path.resolve()}")
    print("You can now analyze the docking results using your preferred molecular visualization tools.")