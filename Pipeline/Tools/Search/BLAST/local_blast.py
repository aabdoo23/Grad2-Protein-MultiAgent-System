import os
import subprocess
import tempfile
import pandas as pd
import io
import requests
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from .schema_normalizer import MSASchemaNormalizer

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define paths to local BLAST executables
BLASTP_PATH = os.path.join("Tools", "Search", "BLAST", "blastp", "blastp.exe")
MAKEBLASTDB_PATH = os.path.join("Tools", "Search", "BLAST", "blastp", "makeblastdb.exe")

# Define path for BLAST databases
BLAST_DBS_DIR = os.path.join("static", "blast_dbs")
os.makedirs(BLAST_DBS_DIR, exist_ok=True)

class LocalBlastSearcher:
    def __init__(self):
        self.default_database = os.path.join(BLAST_DBS_DIR, "pfam_db")
        self.default_e_value = 0.0001
        self.default_iterations = 1
        self.active_databases = {}  # Store active database paths
        self.schema_normalizer = MSASchemaNormalizer()

    def _check_blast_installation(self) -> bool:
        """Check if local BLAST executables are available."""
        if not os.path.exists(BLASTP_PATH):
            logger.error(f"Error: blastp.exe not found at {BLASTP_PATH}")
            return False
        if not os.path.exists(MAKEBLASTDB_PATH):
            logger.error(f"Error: makeblastdb.exe not found at {MAKEBLASTDB_PATH}")
            return False
        logger.info("Local BLAST executables found.")
        return True

    def _get_go_terms(self, interpro_id: str) -> List[str]:
        """Get GO terms for a given InterPro entry ID."""
        base_url = "https://www.ebi.ac.uk/interpro/api/entry/interpro"
        
        try:
            response = requests.get(f"{base_url}/{interpro_id}")
            response.raise_for_status()
            entry_data = response.json()
            
            go_terms = []
            for go_term in entry_data.get("metadata", {}).get("go_terms", []):
                go_terms.append(go_term.get("identifier"))
            
            logger.info(f"Found {len(go_terms)} GO terms for {interpro_id}")
            return go_terms
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching GO terms for {interpro_id}: {e}")
            return []

    def _get_protein_accessions(self, go_term: str) -> List[str]:
        """Get protein accessions for a given GO term."""
        go_url = "https://www.ebi.ac.uk/interpro/api/protein/uniprot"
        
        try:
            response = requests.get(f"{go_url}?go_term={go_term}")
            response.raise_for_status()
            proteins_data = response.json()
            
            accessions = []
            for protein in proteins_data.get("results", []):
                accession = protein.get("metadata", {}).get("accession")
                if accession:
                    accessions.append(accession)
            
            logger.info(f"Found {len(accessions)} protein accessions for GO term {go_term}")
            return accessions
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching protein accessions for GO term {go_term}: {e}")
            return []

    def _get_protein_sequence(self, accession: str) -> Dict[str, Any]:
        """Get protein sequence for a given accession."""
        accession_url = "https://www.ebi.ac.uk/interpro/api/protein/uniprot"
        
        try:
            response = requests.get(f"{accession_url}/{accession}")
            response.raise_for_status()
            protein_data = response.json()
            
            metadata = protein_data.get("metadata", {})
            sequence = metadata.get("sequence", "")
            name = metadata.get("name", "")
            accession = metadata.get("accession", "")
            
            if sequence:
                logger.info(f"Retrieved sequence for {accession} ({name})")
                return {
                    "accession": accession,
                    "name": name,
                    "sequence": sequence
                }
            else:
                logger.warning(f"No sequence found for {accession}")
                return {}
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching sequence for {accession}: {e}")
            return {}

    def _get_pfam_sequences(self, interpro_ids: List[str]) -> List[str]:
        """Fetch sequences for given InterPro IDs using a multi-step approach."""
        sequences = []
        
        for interpro_id in interpro_ids:
            logger.info(f"Processing InterPro ID: {interpro_id}")
            
            go_terms = self._get_go_terms(interpro_id)
            
            all_accessions = []
            for go_term in go_terms:
                accessions = self._get_protein_accessions(go_term)
                all_accessions.extend(accessions)
                time.sleep(1)
            
            unique_accessions = list(set(all_accessions))
            logger.info(f"Found {len(unique_accessions)} unique protein accessions for {interpro_id}")
            
            for accession in unique_accessions:
                protein_data = self._get_protein_sequence(accession)
                
                if protein_data and protein_data.get("sequence"):
                    fasta_entry = f">{protein_data['accession']}|{protein_data['name']}\n{protein_data['sequence']}\n"
                    sequences.append(fasta_entry)
        
        logger.info(f"Retrieved {len(sequences)} total sequences")
        return sequences

    def _get_db_path(self, db_name: str) -> str:
        """Generate a unique database path with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_folder = f"{db_name}_{timestamp}"
        db_path = os.path.join(BLAST_DBS_DIR, db_folder)
        os.makedirs(db_path, exist_ok=True)
        return os.path.join(db_path, db_name)

    def _create_pfam_database(self, interpro_ids: List[str]) -> bool:
        """Create a BLAST database from InterPro sequences."""
        sequences = self._get_pfam_sequences(interpro_ids)
        
        if not sequences:
            logger.error("No sequences retrieved from InterPro API")
            return False
        
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".fasta") as temp_fasta:
            temp_fasta.writelines(sequences)
            temp_fasta_path = temp_fasta.name
        
        try:
            db_path = self._get_db_path("pfam_db")
            # Remove existing database files if they exist
            for ext in ['.phr', '.pin', '.psq', '.pdb', '.pot', '.ptf', '.pto']:
                try:
                    os.remove(f"{db_path}{ext}")
                except FileNotFoundError:
                    pass
            
            # Create database with explicit file permissions
            subprocess.run(
                [MAKEBLASTDB_PATH, "-in", temp_fasta_path, "-dbtype", "prot", "-out", db_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Ensure database files are readable
            for ext in ['.phr', '.pin', '.psq']:
                file_path = f"{db_path}{ext}"
                if os.path.exists(file_path):
                    os.chmod(file_path, 0o644)
            
            # Store the active database path
            self.active_databases["pfam_db"] = db_path
            logger.info(f"BLAST database created successfully at {db_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Error creating BLAST database: {e}")
            return False
        finally:
            os.remove(temp_fasta_path)

    def _create_blast_database_from_fasta(self, fasta_file_path: str, db_name: str = "custom_db") -> bool:
        """Create a BLAST database from a user-provided FASTA file."""
        if not os.path.exists(fasta_file_path):
            logger.error(f"Error: FASTA file not found at {fasta_file_path}")
            return False
        
        try:
            db_path = self._get_db_path(db_name)
            # Remove existing database files if they exist
            for ext in ['.phr', '.pin', '.psq', '.pdb', '.pot', '.ptf', '.pto']:
                try:
                    os.remove(f"{db_path}{ext}")
                except FileNotFoundError:
                    pass
            
            # Create database with explicit file permissions
            subprocess.run(
                [MAKEBLASTDB_PATH, "-in", fasta_file_path, "-dbtype", "prot", "-out", db_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Ensure database files are readable
            for ext in ['.phr', '.pin', '.psq']:
                file_path = f"{db_path}{ext}"
                if os.path.exists(file_path):
                    os.chmod(file_path, 0o644)
            
            # Store the active database path
            self.active_databases[db_name] = db_path
            logger.info(f"BLAST database '{db_name}' created successfully at {db_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Error creating BLAST database: {e}")
            return False

    def _generate_msa(self, sequence: str, hits: List[Dict[str, Any]]) -> str:
        """Generate a FASTA format MSA from BLAST hits."""
        msa_lines = []
        
        # Add query sequence
        msa_lines.append(f">Query (100.00%)\n{sequence}\n")
        
        # Add hit sequences
        for hit in hits:
            if hit["hsps"]:
                hsp = hit["hsps"][0]
                # Use the pident value directly from BLAST results
                identity = hsp["identity"]
                # Get the hit sequence with gaps for proper alignment
                hit_sequence = hsp["hseq"]  # Keep gaps for MSA
                # Add hit sequence with identity
                msa_lines.append(f">{hit['accession']} ({identity:.2f}%)\n{hit_sequence}\n")
        
        return "".join(msa_lines)

    def _run_blast_search(self, sequence: str, db_name: str = "pfam_db") -> Optional[pd.DataFrame]:
        """Run BLAST search against the specified database."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_fasta:
            temp_fasta.write(f">query\n{sequence}\n")
            temp_fasta_path = temp_fasta.name
        
        try:
            # Get the active database path
            db_path = self.active_databases.get(db_name)
            if not db_path:
                logger.error(f"No active database found for {db_name}")
                return None
            
            # Verify database files exist and are readable
            for ext in ['.phr', '.pin', '.psq']:
                file_path = f"{db_path}{ext}"
                if not os.path.exists(file_path):
                    logger.error(f"Database file not found: {file_path}")
                    return None
                if not os.access(file_path, os.R_OK):
                    logger.error(f"Database file not readable: {file_path}")
                    return None
            
            # Run BLAST with tabular output and include sequence data
            result = subprocess.run(
                [BLASTP_PATH, "-db", db_path, "-query", temp_fasta_path, 
                 "-outfmt", "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore qseq sseq"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"BLAST search failed: {result.stderr}")
                return None
            
            columns = ["qseqid", "sseqid", "pident", "length", "mismatch",
                      "gapopen", "qstart", "qend", "sstart", "send", "evalue", 
                      "bitscore", "qseq", "sseq"]
            
            try:
                df = pd.read_csv(io.StringIO(result.stdout), sep='\t', header=None, names=columns)
                return df
            except pd.errors.EmptyDataError:
                logger.warning("No significant hits found.")
                return None
                
        except Exception as e:
            logger.error(f"Error running BLAST search: {e}")
            return None
        finally:
            os.remove(temp_fasta_path)

    def search(self, sequence: str, fasta_file: Optional[str] = None, 
              db_name: Optional[str] = None, interpro_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Submit a local BLAST search and return the results immediately."""
        try:
            # Check BLAST installation
            if not self._check_blast_installation():
                return {"success": False, "error": "BLAST executables not found"}
            
            # Create or use database
            if interpro_ids:
                if not self._create_pfam_database(interpro_ids):
                    return {"success": False, "error": "Failed to create database from InterPro IDs"}
                db_name = "pfam_db"
            elif fasta_file:
                if not self._create_blast_database_from_fasta(fasta_file, db_name or "custom_db"):
                    return {"success": False, "error": "Failed to create database from FASTA file"}
                db_name = db_name or "custom_db"
            
            # Run BLAST search
            results = self._run_blast_search(sequence, db_name or self.default_database)
            
            if results is None:
                return {"success": False, "error": "No significant hits found"}
            
            # Format results
            formatted_results = {
                "hits": [],
                "statistics": {
                    "total_hits": len(results),
                    "max_identity": results["pident"].max(),
                    "min_identity": results["pident"].min(),
                    "avg_identity": results["pident"].mean()
                }
            }
            
            # Process hits
            # Sort results by identity percentage in descending order and take top 40
            sorted_results = results.sort_values(by="pident", ascending=False).head(40)
            
            for _, row in sorted_results.iterrows():
                print(row["pident"])
                # Skip hits with less than 40% identity
                if row["pident"] < 40:
                    continue
                    
                hit = {
                    "id": row["sseqid"],
                    "accession": row["sseqid"].split("|")[0] if "|" in row["sseqid"] else row["sseqid"],
                    "def": row["sseqid"],
                    "len": row["length"],
                    "hsps": [{
                        "score": row["bitscore"],
                        "evalue": row["evalue"],
                        "identity": row["pident"],
                        "gaps": row["gapopen"],
                        "qseq": row["qseq"],
                        "hseq": row["sseq"],
                        "midline": "".join("|" if q == s else " " for q, s in zip(row["qseq"], row["sseq"])),
                        "qstart": row["qstart"],
                        "qend": row["qend"],
                        "sstart": row["sstart"],
                        "send": row["send"]
                    }]
                }
                formatted_results["hits"].append(hit)
            
            # Generate MSA
            msa = self._generate_msa(sequence, formatted_results["hits"])
            
            # Add MSA to results
            formatted_results["alignments"] = {
                "local_blast": {
                    "fasta": {
                        "alignment": msa
                    }
                }
            }
            
            # Normalize results using the schema normalizer
            normalized_results = self.schema_normalizer.normalize_blast_results(formatted_results, sequence)
            
            return {
                "success": True,
                "results": normalized_results
            }
            
        except Exception as e:
            logger.error(f"Error during local BLAST search: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_results(self, rid: str) -> Dict[str, Any]:
        """Check the status and get results of a local BLAST search.
        
        Args:
            rid (str): The Request ID (not used for local BLAST)
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if check was successful
                - status: Current status ('completed' or 'failed')
                - results: Processed results if completed
                - error: Error message if unsuccessful
        """
        try:
            # For local BLAST, we don't need to check status as results are returned immediately
            return {
                "success": False,
                "status": "failed",
                "error": "Local BLAST search returns results immediately, no need to check status"
            }
        except Exception as e:
            logger.error(f"Error checking local BLAST results: {str(e)}")
            return {
                "success": False,
                "status": "failed",
                "error": str(e)
            }
