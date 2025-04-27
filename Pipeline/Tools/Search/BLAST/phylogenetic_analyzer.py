from Bio import Phylo
from Bio.Phylo.TreeConstruction import DistanceCalculator, DistanceTreeConstructor
from Bio import AlignIO
from Bio.Align import MultipleSeqAlignment
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

class PhylogeneticAnalyzer:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
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
            alignment = self._create_alignment(sequences)
            
            # Calculate distance matrix
            calculator = DistanceCalculator('identity')
            distance_matrix = calculator.get_distance(alignment)
            
            # Construct phylogenetic tree
            constructor = DistanceTreeConstructor(calculator, 'nj')
            tree = constructor.build_tree(alignment)
            
            # Save tree to file
            tree_file = os.path.join(self.temp_dir, 'phylogenetic_tree.newick')
            Phylo.write(tree, tree_file, 'newick')
            print(tree_file)
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
                        sequences.append(SeqRecord(
                            Seq(hsp['hseq']),
                            id=hit.get('accession', 'Unknown'),
                            description=hit.get('def', '')
                        ))
                    
        return sequences
        
    def _create_alignment(self, sequences):
        """
        Create multiple sequence alignment
        
        Args:
            sequences (list): List of SeqRecord objects
            
        Returns:
            MultipleSeqAlignment: Aligned sequences
        """
        if not sequences:
            logger.error("No sequences to align")
            return None
            
        # For now, we'll use a simple alignment method
        # In a production environment, you might want to use more sophisticated
        # alignment tools like ClustalW or MUSCLE
        try:
            alignment = MultipleSeqAlignment(sequences)
            return alignment
        except Exception as e:
            logger.error(f"Error creating alignment: {str(e)}")
            return None 