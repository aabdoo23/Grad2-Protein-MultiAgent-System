from typing import Dict, Any, List, Optional
import logging
import os
from datetime import datetime
import json
from Bio import SeqIO, AlignIO, Phylo
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord
from Bio.Align import MultipleSeqAlignment
from Bio.Phylo.TreeConstruction import DistanceCalculator, DistanceTreeConstructor
from Bio.Phylo.TreeConstruction import ParsimonyTreeConstructor, ParsimonyScorer
from Bio.Phylo._io import write, read
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PhylogeneticTreeBuilder:
    """Build phylogenetic trees from MSA data from BLAST searches."""
    
    def __init__(self, static_dir: Optional[str] = None):
        # Use static directory for consistent file management
        if static_dir is None:
            # Default to static/phylo_results relative to the project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.join(current_dir, "..", "..", "..")
            static_dir = os.path.join(project_root, "static", "phylo_results")
        
        self.static_dir = os.path.abspath(static_dir)
        
        # Create directory if it doesn't exist
        os.makedirs(self.static_dir, exist_ok=True)
        
        # Create session-specific subdirectory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_dir = os.path.join(self.static_dir, f"session_{timestamp}")
        os.makedirs(self.session_dir, exist_ok=True)
        
        logger.info(f"PhylogeneticTreeBuilder initialized with static dir: {self.static_dir}")
        logger.info(f"Session directory: {self.session_dir}")
    
    def build_tree_from_blast_results(self, blast_results: Dict[str, Any], parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Build a phylogenetic tree from BLAST results MSA data.
        
        Args:
            blast_results (Dict): Normalized BLAST results containing MSA sequences
            parameters (Dict): Configuration parameters for tree building
            
        Returns:
            Dict: Results containing tree in various formats and metadata
        """
        try:
            # Extract parameters
            tree_method = parameters.get("method", "neighbor_joining") if parameters else "neighbor_joining"
            distance_model = parameters.get("distance_model", "identity") if parameters else "identity"
            max_sequences = parameters.get("max_sequences", 50) if parameters else 50
            min_sequence_length = parameters.get("min_sequence_length", 50) if parameters else 50
            remove_gaps = parameters.get("remove_gaps", True) if parameters else True
            
            # Validate blast results structure
            if not blast_results or not isinstance(blast_results, dict):
                return {"success": False, "error": "Invalid BLAST results format"}
            
            if "msa" not in blast_results or "sequences" not in blast_results["msa"]:
                return {"success": False, "error": "No MSA sequences found in BLAST results"}
            
            sequences = blast_results["msa"]["sequences"]
            
            if len(sequences) < 3:
                return {"success": False, "error": "Need at least 3 sequences to build a phylogenetic tree"}
            
            # Filter and prepare sequences
            filtered_sequences = self._filter_sequences(sequences, max_sequences, min_sequence_length)
            
            if len(filtered_sequences) < 3:
                return {"success": False, "error": "Not enough valid sequences after filtering"}
            
            # Create alignment
            alignment = self._create_alignment(filtered_sequences, remove_gaps)
            
            if alignment is None:
                return {"success": False, "error": "Failed to create alignment"}
            
            # Build tree
            tree_result = self._build_tree(alignment, tree_method, distance_model)
            
            if not tree_result["success"]:
                return tree_result
            
            # Generate visualization data
            viz_data = self._generate_visualization_data(tree_result["tree"])
            
            # Save files
            tree_files = self._save_tree_files(tree_result["tree"], alignment)
            
            # Prepare result
            result = {
                "success": True,
                "tree": {
                    "newick": tree_result["newick"],
                    "visualization": viz_data,
                    "files": tree_files
                },
                "alignment": {
                    "sequences_used": len(filtered_sequences),
                    "alignment_length": len(alignment[0]) if alignment else 0,
                    "sequence_info": [
                        {
                            "id": seq["id"],
                            "name": seq.get("name", seq["id"]),
                            "identity": seq.get("identity", 0),
                            "database": seq.get("database", "unknown")
                        }
                        for seq in filtered_sequences
                    ]
                },
                "metadata": {
                    "method": tree_method,
                    "distance_model": distance_model,
                    "max_sequences": max_sequences,
                    "min_sequence_length": min_sequence_length,
                    "remove_gaps": remove_gaps,
                    "timestamp": datetime.now().isoformat(),
                    "source_type": blast_results.get("metadata", {}).get("search_type", "unknown"),
                    "session_dir": self.session_dir,
                    "static_dir": self.static_dir
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error building phylogenetic tree: {str(e)}")
            return {"success": False, "error": f"Failed to build phylogenetic tree: {str(e)}"}
    
    def _filter_sequences(self, sequences: List[Dict], max_sequences: int, min_length: int) -> List[Dict]:
        """Filter sequences based on criteria."""
        try:
            # Remove sequences that are too short or have no sequence data
            valid_sequences = [
                seq for seq in sequences 
                if seq.get("sequence") and len(seq["sequence"].replace("-", "")) >= min_length
            ]
            
            # Sort by identity (highest first) if available
            valid_sequences.sort(key=lambda x: x.get("identity", 0), reverse=True)
            
            # Limit to max_sequences
            return valid_sequences[:max_sequences]
            
        except Exception as e:
            logger.error(f"Error filtering sequences: {str(e)}")
            return []
    
    def _create_alignment(self, sequences: List[Dict], remove_gaps: bool = True) -> Optional[MultipleSeqAlignment]:
        """Create a BioPython alignment from sequence data."""
        try:
            seq_records = []
            
            for i, seq_data in enumerate(sequences):
                seq_id = seq_data.get("id", f"seq_{i}")
                sequence = seq_data.get("sequence", "")
                
                if remove_gaps:
                    sequence = sequence.replace("-", "")
                
                if sequence:
                    record = SeqRecord(Seq(sequence), id=seq_id, description=seq_data.get("name", ""))
                    seq_records.append(record)
            
            if len(seq_records) < 3:
                return None
            
            # If sequences are of different lengths, we need to align them
            # For now, we'll pad shorter sequences with gaps
            max_length = max(len(record.seq) for record in seq_records)
            
            aligned_records = []
            for record in seq_records:
                seq_str = str(record.seq)
                if len(seq_str) < max_length:
                    seq_str += "-" * (max_length - len(seq_str))
                aligned_record = SeqRecord(Seq(seq_str), id=record.id, description=record.description)
                aligned_records.append(aligned_record)
            
            return MultipleSeqAlignment(aligned_records)
            
        except Exception as e:
            logger.error(f"Error creating alignment: {str(e)}")
            return None
    
    def _build_tree(self, alignment: MultipleSeqAlignment, method: str, distance_model: str) -> Dict[str, Any]:
        """Build phylogenetic tree from alignment."""
        try:
            if method.lower() == "neighbor_joining":
                return self._build_nj_tree(alignment, distance_model)
            elif method.lower() == "upgma":
                return self._build_upgma_tree(alignment, distance_model)
            elif method.lower() == "parsimony":
                return self._build_parsimony_tree(alignment)
            else:
                return {"success": False, "error": f"Unknown tree building method: {method}"}
                
        except Exception as e:
            logger.error(f"Error building tree: {str(e)}")
            return {"success": False, "error": f"Failed to build tree: {str(e)}"}
    
    def _build_nj_tree(self, alignment: MultipleSeqAlignment, distance_model: str) -> Dict[str, Any]:
        """Build neighbor-joining tree."""
        try:
            calculator = DistanceCalculator(distance_model)
            distance_matrix = calculator.get_distance(alignment)
            
            constructor = DistanceTreeConstructor()
            tree = constructor.nj(distance_matrix)
            
            # Convert tree to Newick format
            tree_file = os.path.join(self.session_dir, "tree.nwk")
            write(tree, tree_file, "newick")
            
            with open(tree_file, 'r') as f:
                newick = f.read().strip()
            
            return {
                "success": True,
                "tree": tree,
                "newick": newick,
                "method": "neighbor_joining",
                "distance_model": distance_model
            }
            
        except Exception as e:
            logger.error(f"Error building NJ tree: {str(e)}")
            return {"success": False, "error": f"Failed to build NJ tree: {str(e)}"}
    
    def _build_upgma_tree(self, alignment: MultipleSeqAlignment, distance_model: str) -> Dict[str, Any]:
        """Build UPGMA tree."""
        try:
            calculator = DistanceCalculator(distance_model)
            distance_matrix = calculator.get_distance(alignment)
            
            constructor = DistanceTreeConstructor()
            tree = constructor.upgma(distance_matrix)
            
            # Convert tree to Newick format
            tree_file = os.path.join(self.session_dir, "tree.nwk")
            write(tree, tree_file, "newick")
            
            with open(tree_file, 'r') as f:
                newick = f.read().strip()
            
            return {
                "success": True,
                "tree": tree,
                "newick": newick,
                "method": "upgma",
                "distance_model": distance_model
            }
            
        except Exception as e:
            logger.error(f"Error building UPGMA tree: {str(e)}")
            return {"success": False, "error": f"Failed to build UPGMA tree: {str(e)}"}
    
    def _build_parsimony_tree(self, alignment: MultipleSeqAlignment) -> Dict[str, Any]:
        """Build maximum parsimony tree."""
        try:
            scorer = ParsimonyScorer()
            constructor = ParsimonyTreeConstructor(scorer)
            
            # Start with a simple NJ tree for parsimony
            calculator = DistanceCalculator('identity')
            distance_matrix = calculator.get_distance(alignment)
            nj_constructor = DistanceTreeConstructor()
            starting_tree = nj_constructor.nj(distance_matrix)
            
            tree = constructor.build_tree(alignment)
            
            # Convert tree to Newick format
            tree_file = os.path.join(self.session_dir, "tree.nwk")
            write(tree, tree_file, "newick")
            
            with open(tree_file, 'r') as f:
                newick = f.read().strip()
            
            return {
                "success": True,
                "tree": tree,
                "newick": newick,
                "method": "parsimony",
                "distance_model": "parsimony"
            }
            
        except Exception as e:
            logger.error(f"Error building parsimony tree: {str(e)}")
            return {"success": False, "error": f"Failed to build parsimony tree: {str(e)}"}
    
    def _generate_visualization_data(self, tree) -> Dict[str, Any]:
        """Generate data for tree visualization."""
        try:
            # Extract node and branch information
            nodes = []
            edges = []
            
            def add_node_recursive(clade, parent_id=None, depth=0):
                node_id = len(nodes)
                
                # Create node
                node = {
                    "id": node_id,
                    "name": clade.name if clade.name else f"Node_{node_id}",
                    "depth": depth,
                    "branch_length": clade.branch_length if clade.branch_length else 0,
                    "is_terminal": clade.is_terminal()
                }
                nodes.append(node)
                
                # Add edge to parent if exists
                if parent_id is not None:
                    edges.append({
                        "source": parent_id,
                        "target": node_id,
                        "length": node["branch_length"]
                    })
                
                # Process children
                for child in clade.clades:
                    add_node_recursive(child, node_id, depth + 1)
                
                return node_id
            
            add_node_recursive(tree.root)
            
            return {
                "nodes": nodes,
                "edges": edges,
                "total_nodes": len(nodes),
                "terminal_nodes": len([n for n in nodes if n["is_terminal"]]),
                "max_depth": max(n["depth"] for n in nodes) if nodes else 0
            }
            
        except Exception as e:
            logger.error(f"Error generating visualization data: {str(e)}")
            return {"error": f"Failed to generate visualization data: {str(e)}"}
    
    def _save_tree_files(self, tree, alignment: MultipleSeqAlignment) -> Dict[str, str]:
        """Save tree and alignment files."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Save tree in Newick format
            newick_file = os.path.join(self.session_dir, f"phylo_tree_{timestamp}.nwk")
            write(tree, newick_file, "newick")
            
            # Save tree in Nexus format
            nexus_file = os.path.join(self.session_dir, f"phylo_tree_{timestamp}.nex")
            write(tree, nexus_file, "nexus")
            
            # Save alignment in FASTA format
            fasta_file = os.path.join(self.session_dir, f"alignment_{timestamp}.fasta")
            with open(fasta_file, 'w') as f:
                SeqIO.write(alignment, f, "fasta")
            
            # Save alignment in PHYLIP format
            phylip_file = os.path.join(self.session_dir, f"alignment_{timestamp}.phy")
            with open(phylip_file, 'w') as f:
                AlignIO.write(alignment, f, "phylip")
            
            return {
                "newick": newick_file,
                "nexus": nexus_file,
                "alignment_fasta": fasta_file,
                "alignment_phylip": phylip_file
            }
            
        except Exception as e:
            logger.error(f"Error saving files: {str(e)}")
            return {"error": f"Failed to save files: {str(e)}"}
    
    def cleanup(self, remove_session_dir: bool = False):
        """Clean up files. Optionally remove the entire session directory."""
        try:
            import shutil
            if remove_session_dir and os.path.exists(self.session_dir):
                shutil.rmtree(self.session_dir)
                logger.info(f"Cleaned up session directory: {self.session_dir}")
            else:
                logger.info(f"Session files preserved in: {self.session_dir}")
        except Exception as e:
            logger.warning(f"Failed to cleanup session directory: {str(e)}")
