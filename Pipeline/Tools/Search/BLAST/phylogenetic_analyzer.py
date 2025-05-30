from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
import tempfile
import os
import logging
from .clustalo import serviceRun, serviceGetStatus, serviceGetResult
import time

logger = logging.getLogger(__name__)

class PhylogeneticAnalyzer:
    def __init__(self, email):
        self.temp_dir = tempfile.mkdtemp()
        self.email = email
        
    def create_phylogenetic_tree(self, blast_results):
        """
        Create a phylogenetic tree from BLAST results
        
        Args:
            blast_results (dict): BLAST search results containing hits and their sequences
            
        Returns:
            str: Path to the generated phylogenetic tree file
        """
        try:
            # Extract sequences from BLAST results
            sequences = self._extract_sequences(blast_results)
            
            if not sequences:
                logger.error("No sequences found in BLAST results")
                return None
                
            # Create multiple sequence alignment
            alignment_file = self._create_alignment(sequences)
            
            if not alignment_file:
                logger.error("Failed to create alignment")
                return None
                
            # Create phylogenetic tree using FastTree
            tree_file = os.path.join(self.temp_dir, 'tree.nwk')
            os.system(f"fasttree {alignment_file} > {tree_file}")
            
            return tree_file
            
        except Exception as e:
            logger.error(f"Error creating phylogenetic tree: {str(e)}")
            return None
            
    def _extract_sequences(self, blast_results):
        """
        Extract sequences from BLAST results
        
        Args:
            blast_results (dict): BLAST search results
            
        Returns:
            list: List of SeqRecord objects
        """
        sequences = []
        
        # Add query sequence
        if 'query' in blast_results and blast_results['query']:
            sequences.append(SeqRecord(
                Seq(blast_results['query']),
                id='Query',
                description='Query sequence'
            ))
            
        # Add hit sequences
        if 'hits' in blast_results:
            for hit in blast_results['hits']:
                if 'hsps' in hit and hit['hsps']:
                    # Use the first HSP's sequence
                    hsp = hit['hsps'][0]
                    if 'hseq' in hsp and hsp['hseq']:
                        # Remove gaps from the sequence
                        sequence = hsp['hseq'].replace('-', '')
                        sequences.append(SeqRecord(
                            Seq(sequence),
                            id=hit.get('accession', 'Unknown'),
                            description=hit.get('def', '')
                        ))
                    
        return sequences
        
    def _create_alignment(self, sequences):
        """
        Create multiple sequence alignment using EMBL-EBI's Clustal Omega Python client
        
        Args:
            sequences (list): List of SeqRecord objects
            
        Returns:
            str: Path to the alignment file
        """
        if not sequences:
            logger.error("No sequences to align")
            return None
            
        try:
            # Format sequences for submission
            formatted_sequences = []
            for seq in sequences:
                formatted_sequences.append(f">{seq.id}\n{seq.seq}")
            
            sequence_data = "\n".join(formatted_sequences)
            
            # Submit job to EMBL-EBI
            params = {
                'email': self.email,
                'sequence': sequence_data,
                'outfmt': 'clustal_num',
                'stype': 'protein',
                'dealign': 'false',
                'mbed': 'true',
                'mbediteration': 'true'
            }
            
            # Submit the job
            job_id = serviceRun(self.email, None, params)
            logger.info(f"Submitted Clustal Omega job: {job_id}")
            
            # Wait for job to complete
            status = "RUNNING"
            while status == "RUNNING":
                status = serviceGetStatus(job_id)
                logger.info(f"Job status: {status}")
                if status == "ERROR":
                    logger.error("Alignment job failed")
                    return None
                if status != "FINISHED":
                    time.sleep(5)  # Wait 5 seconds between checks
            
            # Get the alignment result
            alignment_result = serviceGetResult(job_id, "aln-clustal_num")
            
            # Save alignment to file
            alignment_file = os.path.join(self.temp_dir, 'alignment.aln')
            with open(alignment_file, 'w') as f:
                f.write(alignment_result)
            
            return alignment_file
            
        except Exception as e:
            logger.error(f"Error creating alignment: {str(e)}")
            return None

    def create_phylogenetic_tree_from_alignment(self, fasta_alignment: str) -> str:
        """
        Create a phylogenetic tree from a FASTA alignment string
        
        Args:
            fasta_alignment (str): FASTA-formatted alignment string
            
        Returns:
            str: Path to the phylogenetic tree file
        """
        try:
            # Save the FASTA alignment to a file
            alignment_file = os.path.join(self.temp_dir, 'alignment.fasta')
            with open(alignment_file, 'w') as f:
                f.write(fasta_alignment)
            
            # Create phylogenetic tree using FastTree
            tree_file = os.path.join(self.temp_dir, 'tree.nwk')
            os.system(f"fasttree {alignment_file} > {tree_file}")
            
            return tree_file
            
        except Exception as e:
            logger.error(f"Error creating phylogenetic tree from alignment: {str(e)}")
            return None 