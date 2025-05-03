import os
import subprocess
import tempfile
import pandas as pd
from collections import defaultdict
import io
import requests
import time
from typing import List, Dict, Any, Optional

# Define paths to local BLAST executables
BLASTP_PATH = os.path.join("Tools", "Search", "BLAST", "blastp", "blastp.exe")
MAKEBLASTDB_PATH = os.path.join("Tools", "Search", "BLAST", "blastp", "makeblastdb.exe")

def check_blast_installation():
    """Check if local BLAST executables are available."""
    if not os.path.exists(BLASTP_PATH):
        print(f"Error: blastp.exe not found at {BLASTP_PATH}")
        return False
    if not os.path.exists(MAKEBLASTDB_PATH):
        print(f"Error: makeblastdb.exe not found at {MAKEBLASTDB_PATH}")
        return False
    print("Local BLAST executables found.")
    return True

def get_go_terms(interpro_id: str) -> List[str]:
    """Get GO terms for a given InterPro entry ID."""
    base_url = "https://www.ebi.ac.uk/interpro/api/entry/interpro"
    
    try:
        # Get InterPro entry details
        response = requests.get(f"{base_url}/{interpro_id}")
        response.raise_for_status()
        entry_data = response.json()
        
        # Extract GO terms
        go_terms = []
        for go_term in entry_data.get("metadata", {}).get("go_terms", []):
            go_terms.append(go_term.get("identifier"))
        
        print(f"Found {len(go_terms)} GO terms for {interpro_id}")
        return go_terms
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching GO terms for {interpro_id}: {e}")
        return []

def get_protein_accessions(go_term: str) -> List[str]:
    """Get protein accessions for a given GO term."""
    go_url = "https://www.ebi.ac.uk/interpro/api/protein/uniprot"
    
    try:
        # Query for proteins with this GO term
        response = requests.get(f"{go_url}?go_term={go_term}")
        response.raise_for_status()
        proteins_data = response.json()
        print(proteins_data)
        # Extract accessions
        accessions = []
        for protein in proteins_data.get("results", []):
            accession = protein.get("metadata", {}).get("accession")
            if accession:
                accessions.append(accession)

        
        for protein in proteins_data.get("results", []):
            accession = protein.get("metadata", {}).get("accession")
            if accession:
                accessions.append(accession)

        print(f"Found {len(accessions)} protein accessions for GO term {go_term}")
        return accessions
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching protein accessions for GO term {go_term}: {e}")
        return []

def get_protein_sequence(accession: str) -> Dict[str, Any]:
    """Get protein sequence for a given accession."""
    accession_url = "https://www.ebi.ac.uk/interpro/api/protein/uniprot"
    
    try:
        # Get protein details
        response = requests.get(f"{accession_url}/{accession}")
        response.raise_for_status()
        protein_data = response.json()
        
        metadata = protein_data.get("metadata", {})
        sequence = metadata.get("sequence", "")
        name = metadata.get("name", "")
        accession = metadata.get("accession", "")
        
        if sequence:
            print(f"Retrieved sequence for {accession} ({name})")
            return {
                "accession": accession,
                "name": name,
                "sequence": sequence
            }
        else:
            print(f"No sequence found for {accession}")
            return {}
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching sequence for {accession}: {e}")
        return {}

def get_pfam_sequences(interpro_ids: List[str]) -> List[str]:
    """Fetch sequences for given InterPro IDs using a multi-step approach."""
    sequences = []
    
    for interpro_id in interpro_ids:
        print(f"Processing InterPro ID: {interpro_id}")
        
        # Step 1: Get GO terms for this InterPro ID
        go_terms = get_go_terms(interpro_id)
        
        # Step 2: For each GO term, get protein accessions
        all_accessions = []
        for go_term in go_terms:
            accessions = get_protein_accessions(go_term)
            all_accessions.extend(accessions)
            time.sleep(1)
        
        # Remove duplicates
        unique_accessions = list(set(all_accessions))
        print(f"Found {len(unique_accessions)} unique protein accessions for {interpro_id}")
        
        # Step 3: For each accession, get the protein sequence
        for accession in unique_accessions: 
            protein_data = get_protein_sequence(accession)
            
            if protein_data and protein_data.get("sequence"):
                fasta_entry = f">{protein_data['accession']}|{protein_data['name']}\n{protein_data['sequence']}\n"
                sequences.append(fasta_entry)
    
    print(f"Retrieved {len(sequences)} total sequences")
    return sequences

def create_pfam_database(interpro_ids: List[str]):
    """Create a BLAST database from InterPro sequences."""
    # Get sequences from InterPro API
    sequences = get_pfam_sequences(interpro_ids)
    
    if not sequences:
        print("No sequences retrieved from InterPro API")
        return False
    
    # Create a temporary file for sequences
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".fasta") as temp_fasta:
        temp_fasta.writelines(sequences)
        temp_fasta_path = temp_fasta.name
    
    # Create BLAST database
    try:
        subprocess.run(
            [MAKEBLASTDB_PATH, "-in", temp_fasta_path, "-dbtype", "prot", "-out", "pfam_db"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print("BLAST database created successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error creating BLAST database: {e}")
        return False
    finally:
        # Clean up temporary file
        os.remove(temp_fasta_path)

def create_blast_database_from_fasta(fasta_file_path: str, db_name: str = "custom_db") -> bool:
    """Create a BLAST database from a user-provided FASTA file."""
    if not os.path.exists(fasta_file_path):
        print(f"Error: FASTA file not found at {fasta_file_path}")
        return False
    
    try:
        subprocess.run(
            [MAKEBLASTDB_PATH, "-in", fasta_file_path, "-dbtype", "prot", "-out", db_name],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"BLAST database '{db_name}' created successfully from {fasta_file_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error creating BLAST database: {e}")
        return False

def run_blast_search(sequence, db_name="pfam_db"):
    """Run BLAST search against the specified database."""
    # Create a temporary file for the query sequence
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_fasta:
        temp_fasta.write(f">query\n{sequence}\n")
        temp_fasta_path = temp_fasta.name
    
    try:
        # Run BLAST search
        result = subprocess.run(
            [BLASTP_PATH, "-db", db_name, "-query", temp_fasta_path, "-outfmt", "6"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"BLAST search failed: {result.stderr}")
            return None
        
        # Parse BLAST results
        columns = ["qseqid", "sseqid", "pident", "length", "mismatch",
                  "gapopen", "qstart", "qend", "sstart", "send", "evalue", "bitscore"]
        
        try:
            df = pd.read_csv(io.StringIO(result.stdout), sep='\t', header=None, names=columns)
            return df
        except pd.errors.EmptyDataError:
            print("No significant hits found.")
            return None
            
    except Exception as e:
        print(f"Error running BLAST search: {e}")
        return None
    finally:
        # Clean up temporary file
        os.remove(temp_fasta_path)

def main():
    # Check BLAST installation
    if not check_blast_installation():
        return
    
    print("\nBLAST Database Creation Options:")
    print("1. Create database from InterPro IDs")
    print("2. Create database from FASTA file")
    choice = input("Select an option (1/2): ")
    
    db_name = "blast_db"
    
    if choice == "1":
        # Specify InterPro IDs to search against
        interpro_ids_input = input("Enter InterPro IDs (comma-separated, e.g., IPR000975,IPR001811): ")
        interpro_ids = [id.strip() for id in interpro_ids_input.split(",")]
        
        # Create BLAST database
        if not create_pfam_database(interpro_ids):
            return
        db_name = "pfam_db"
        
    elif choice == "2":
        # Get FASTA file path from user
        fasta_file_path = input("Enter path to your FASTA file: ")
        if not create_blast_database_from_fasta(fasta_file_path, db_name):
            return
    else:
        print("Invalid option selected.")
        return
    
    # Get sequence to search
    sequence_input = input("Enter protein sequence to search (or press Enter for sample sequence): ")
    
    if not sequence_input:
        # Sample chemokine sequence to test
        sequence_input = "MKVSLALSLLIAATAFCAPASEAPLVASSTKCTSLISGIYFIKIVREYCIDPSNNNDRLQQLQRLIKHMKKNMQKKVAYTEFIEALKNFIRAVDVFIQHLKKEKEAD"
        print("Using sample sequence.")
    
    # Run BLAST search
    results = run_blast_search(sequence_input, db_name)
    
    if results is not None:
        print("\nBLAST Results:")
        print(results.to_string(index=False))
        
        # Print summary statistics
        print("\nSummary Statistics:")
        print(f"Total hits: {len(results)}")
        print(f"Max identity: {results['pident'].max():.2f}%")
        print(f"Min identity: {results['pident'].min():.2f}%")
        print(f"Average identity: {results['pident'].mean():.2f}%")

if __name__ == "__main__":
    main()