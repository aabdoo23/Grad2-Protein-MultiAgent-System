import logging
from typing import Dict, Any, List, Optional, Union
import os
import subprocess
import requests
import time
import platform
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_blast_paths():
    """Get the correct BLAST executable paths based on the current OS."""
    if platform.system() == "Windows":
        blastp_path = os.path.join("Tools", "Search", "BLAST", "blastp", "blastp.exe")
        makeblastdb_path = os.path.join("Tools", "Search", "BLAST", "blastp", "makeblastdb.exe")
    else:
        # Linux/Mac paths
        blastp_path = os.path.join("Tools", "Search", "BLAST", "blastp-linux", "blastp")
        makeblastdb_path = os.path.join("Tools", "Search", "BLAST", "blastp-linux", "makeblastdb")
    
    return blastp_path, makeblastdb_path

BLASTP_PATH, MAKEBLASTDB_PATH = get_blast_paths()
BLAST_DBS_DIR = os.path.join("static", "blast_dbs")
os.makedirs(BLAST_DBS_DIR, exist_ok=True)

class BlastDatabaseBuilder:
    def __init__(self):
        self.active_databases = {}  # Store active database paths
        self.session = requests.Session()  # Use session for connection pooling

    def _check_blast_installation(self) -> bool:
        """Check if local BLAST executables are available."""
        if not os.path.exists(BLASTP_PATH):
            logger.error(f"Error: blastp not found at {BLASTP_PATH}")
            return False
        if not os.path.exists(MAKEBLASTDB_PATH):
            logger.error(f"Error: makeblastdb not found at {MAKEBLASTDB_PATH}")
            return False
        
        # Check if files are executable (important for Linux)
        if not os.access(BLASTP_PATH, os.X_OK):
            logger.error(f"Error: blastp is not executable at {BLASTP_PATH}")
            return False
        if not os.access(MAKEBLASTDB_PATH, os.X_OK):
            logger.error(f"Error: makeblastdb is not executable at {MAKEBLASTDB_PATH}")
            return False
            
        logger.info("Local BLAST executables found and are executable.")
        return True
    
    def _get_count_of_sequences(self, pfam_ids: List[str]) -> Dict[str, Any]:
        """
        Get sequence counts for given Pfam IDs.
        
        Args:
            pfam_ids (List[str]): List of Pfam IDs to check
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if the request was successful
                - counts: Dict containing counts for each type
                - valid_ids: List of valid Pfam IDs
                - invalid_ids: List of invalid Pfam IDs
        """
        unreviewed_count = 0
        reviewed_count = 0
        uniprot_count = 0
        valid_ids = []
        invalid_ids = []

        for pfam_id in pfam_ids:
            # Clean and validate Pfam ID format
            pfam_id = pfam_id.strip().upper()
            if not pfam_id.startswith('PF'):
                invalid_ids.append(pfam_id)
                continue

            try:
                url = f'https://www.ebi.ac.uk/interpro/api/protein/entry/pfam/{pfam_id}'
                response = requests.get(url)
                response.raise_for_status()
                
                data = response.json()
                unreviewed_count += data["proteins"]["unreviewed"]
                reviewed_count += data["proteins"]["reviewed"]
                uniprot_count += data["proteins"]["uniprot"]
                valid_ids.append(pfam_id)
                
            except (requests.exceptions.RequestException, KeyError) as e:
                logger.error(f"Error fetching data for Pfam ID {pfam_id}: {e}")
                invalid_ids.append(pfam_id)

        return {
            "success": True,
            "counts": {
                "unreviewed": unreviewed_count,
                "reviewed": reviewed_count,
                "uniprot": uniprot_count
            },
            "valid_ids": valid_ids,
            "invalid_ids": invalid_ids
        }
    
    def _get_pfam_sequences(self, pfam_ids: List[str], sequence_types: List[str] = None) -> List[str]:
        """
        Fetch all protein sequences for given Pfam IDs using pagination.
        Returns a list of FASTA formatted sequences.
        
        Args:
            pfam_ids (List[str]): List of Pfam IDs to fetch sequences for
            sequence_types (List[str], optional): List of sequence types to include ('unreviewed', 'reviewed', 'uniprot')
        """
        if sequence_types is None:
            sequence_types = ['unreviewed', 'reviewed', 'uniprot']
            
        all_sequences = []
        for sequence_type in sequence_types:
            logger.info(f"Processing {sequence_type} sequences")
            next_url = f"https://www.ebi.ac.uk/interpro/api/protein/{sequence_type}"
            
            for pfam_id in pfam_ids:
                logger.info(f"Processing Pfam ID: {pfam_id}")
                next_url += f"/entry/pfam/{pfam_id}/?page_size=200&extra_fields=sequence"
                page_count = 1
                total_sequences = 0

                while next_url:
                    try:
                        logger.info(f"Fetching page {page_count} for {pfam_id}...")
                        response = self.session.get(next_url, headers={"Accept": "application/json"})
                        response.raise_for_status()
                        data = response.json()

                        # Process sequences from the current page
                        sequences_on_page = 0
                        for protein in data.get("results", []):
                            accession = protein["metadata"]["accession"]
                            name = protein["metadata"].get("name", "")
                            sequence = protein["extra_fields"]["sequence"]
                            fasta_entry = f">{accession}|{name}\n{sequence}\n"
                            all_sequences.append(fasta_entry)
                            sequences_on_page += 1
                        
                        total_sequences += sequences_on_page
                        logger.info(f"Retrieved {sequences_on_page} sequences from page {page_count}")
                        
                        # Get the URL for the next page of results
                        next_url = data.get("next")
                        page_count += 1
                        
                        # Be a good API citizen and pause briefly between requests
                        if next_url:
                            time.sleep(1)

                    except requests.exceptions.RequestException as e:
                        logger.error(f"Error fetching data for {pfam_id}: {e}")
                        break  # Stop processing this Pfam ID on error

                logger.info(f"Finished fetching {total_sequences} sequences for {pfam_id}")

        logger.info(f"Total sequences collected across all Pfam IDs: {len(all_sequences)}")
        return all_sequences

    def _get_db_path(self, db_name: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_folder = f"{db_name}_{timestamp}"
        db_path = os.path.join(BLAST_DBS_DIR, db_folder)
        os.makedirs(db_path, exist_ok=True)
        return os.path.join(db_path, db_name)

    def _create_pfam_database(self, pfam_ids: List[str], sequence_types: Optional[List[str]] = None) -> bool:
        """Create a BLAST database from Pfam IDs."""
        sequences = self._get_pfam_sequences(pfam_ids, sequence_types=sequence_types)
        if not sequences:
            logger.error("No sequences retrieved from InterPro API")
            return False

        # Create a timestamp for unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save the FASTA file
        fasta_filename = f"pfam_sequences_{timestamp}.fasta"
        fasta_path = os.path.join(BLAST_DBS_DIR, fasta_filename)
        
        with open(fasta_path, "w") as f:
            f.writelines(sequences)

        try:
            db_path = self._get_db_path("pfam_db")
            # Clean up any existing database files
            for ext in ['.phr', '.pin', '.psq', '.pdb', '.pot', '.ptf', '.pto']:
                try:
                    os.remove(f"{db_path}{ext}")
                except FileNotFoundError:
                    pass

            # Create the BLAST database
            subprocess.run(
                [MAKEBLASTDB_PATH, "-in", fasta_path, "-dbtype", "prot", "-out", db_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            # Set appropriate permissions
            for ext in ['.phr', '.pin', '.psq']:
                file_path = f"{db_path}{ext}"
                if os.path.exists(file_path):
                    os.chmod(file_path, 0o644)

            self.active_databases["pfam_db"] = db_path
            logger.info(f"BLAST database created successfully at {db_path}")
            return True, fasta_path

        except subprocess.CalledProcessError as e:
            logger.error(f"Error creating BLAST database: {e}")
            return False, None

    def _create_blast_database_from_fasta(self, fasta_file_path: str, db_name: str = "custom_db") -> bool:
        """Create a BLAST database from a FASTA file."""
        if not os.path.exists(fasta_file_path):
            logger.error(f"Error: FASTA file not found at {fasta_file_path}")
            return False

        try:
            db_path = self._get_db_path(db_name)
            # Clean up any existing database files
            for ext in ['.phr', '.pin', '.psq', '.pdb', '.pot', '.ptf', '.pto']:
                try:
                    os.remove(f"{db_path}{ext}")
                except FileNotFoundError:
                    pass            # Create the BLAST database
            subprocess.run(
                [MAKEBLASTDB_PATH, "-in", fasta_file_path, "-dbtype", "prot", "-out", db_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Set appropriate permissions
            for ext in ['.phr', '.pin', '.psq']:
                file_path = f"{db_path}{ext}"
                if os.path.exists(file_path):
                    os.chmod(file_path, 0o644)
                    
            self.active_databases[db_name] = db_path
            logger.info(f"BLAST database '{db_name}' created successfully at {db_path}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Error creating BLAST database: {e}")
            return False

    def _create_blast_database_from_sequences(self, sequences_list: List[str], db_name: str = "sequences_db") -> tuple:
        """
        Create a BLAST database from a list of protein sequences.
        
        Args:
            sequences_list (List[str]): List of protein sequences
            db_name (str): Name for the database
            
        Returns:
            tuple: (success: bool, fasta_path: str)
        """
        try:
            # Create a timestamp for unique file naming
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            db_dir = os.path.join(BLAST_DBS_DIR, f"{db_name}_{timestamp}")
            os.makedirs(db_dir, exist_ok=True)
            
            # Create FASTA file from sequences
            fasta_file_path = os.path.join(db_dir, f"{db_name}.fasta")
            with open(fasta_file_path, 'w') as f:
                for i, sequence in enumerate(sequences_list):
                    f.write(f">sequence_{i+1}\n{sequence}\n")
            
            logger.info(f"Created FASTA file with {len(sequences_list)} sequences at {fasta_file_path}")
            
            # Create BLAST database from the FASTA file
            success = self._create_blast_database_from_fasta(fasta_file_path, db_name)
            
            return success, fasta_file_path
            
        except Exception as e:
            logger.error(f"Error creating BLAST database from sequences: {e}")
            return False, ""

    def build_database(self,
                      fasta_file: Optional[str] = None,
                      pfam_ids: Optional[Union[str, List[str]]] = None,
                      sequences_list: Optional[List[str]] = None,
                      sequence_types: Optional[List[str]] = None,
                      db_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Build a BLAST database from either a FASTA file, Pfam IDs, or a list of sequences.
        
        Args:
            fasta_file (Optional[str]): Path to FASTA file
            pfam_ids (Optional[Union[str, List[str]]]): Pfam ID(s) as string or list of strings
            sequences_list (Optional[List[str]]): List of protein sequences
            sequence_types (Optional[List[str]]): List of sequence types to include for Pfam IDs
            db_name (Optional[str]): Name for the database
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if build was successful
                - db_path: Path to the created database if successful
                - fasta_path: Path to the FASTA file if successful
                - error: Error message if unsuccessful
        """
        try:
            if not self._check_blast_installation():
                return {"success": False, "error": "BLAST executables not found"}
              # Check that only one input method is provided
            input_count = sum(bool(x) for x in [fasta_file, pfam_ids, sequences_list])
            if input_count == 0:
                return {"success": False, "error": "Either fasta_file, pfam_ids, or sequences_list must be provided"}
            if input_count > 1:
                return {"success": False, "error": "Cannot provide multiple input methods (fasta_file, pfam_ids, sequences_list)"}
            
            if not db_name:
                if fasta_file:
                    db_name = "custom_db"
                elif pfam_ids:
                    db_name = "pfam_db"
                else:
                    db_name = "sequences_db"
                    
            if fasta_file:
                success = self._create_blast_database_from_fasta(fasta_file, db_name)
                fasta_path = fasta_file  # Use the input FASTA file path
            elif sequences_list:
                success, fasta_path = self._create_blast_database_from_sequences(sequences_list, db_name)
            else:
                # Convert single string to list if necessary
                if isinstance(pfam_ids, str):
                    pfam_ids = [pfam_ids]
                success, fasta_path = self._create_pfam_database(pfam_ids, sequence_types=sequence_types)
                db_name = "pfam_db"

            if not success:
                logger.error("Failed to create database for Pfam IDs: %s, FASTA: %s", pfam_ids, fasta_file)
                return {"success": False, "error": "Failed to create database. Check logs for details."}

            db_path = self.active_databases.get(db_name)
            if not db_path:
                return {"success": False, "error": "Database created but path not found"}

            return {
                "success": True,
                "db_path": db_path,
                "db_name": db_name,
                "fasta_path": fasta_path
            }

        except Exception as e:
            logger.error(f"Error building BLAST database: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_active_databases(self) -> Dict[str, str]:
        """Get all currently active database paths."""
        return self.active_databases.copy() 