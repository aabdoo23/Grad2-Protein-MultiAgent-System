from typing import Dict, Any
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MSASchemaNormalizer:
    @staticmethod
    def _calculate_sequence_identity(seq1: str, seq2: str) -> float:
        """Calculate percent identity between two sequences."""
        if not seq1 or not seq2:
            return 0.0
        
        # Remove gaps and align sequences for comparison
        seq1_clean = seq1.replace('-', '').upper()
        seq2_clean = seq2.replace('-', '').upper()
        
        if len(seq1_clean) == 0 or len(seq2_clean) == 0:
            return 0.0
        
        # For aligned sequences, compare position by position
        min_len = min(len(seq1), len(seq2))
        matches = 0
        total_positions = 0
        
        for i in range(min_len):
            if seq1[i] != '-' and seq2[i] != '-':  # Skip gap positions
                total_positions += 1
                if seq1[i].upper() == seq2[i].upper():
                    matches += 1
        
        if total_positions == 0:
            return 0.0
        
        return (matches / total_positions) * 100.0
    
    @staticmethod
    def _estimate_evalue(identity: float, query_length: int, subject_length: int, database_size: int = 1000000) -> float:
        """Estimate E-value based on sequence identity and lengths."""
        # Simple E-value estimation based on identity
        # This is a rough approximation - real E-value calculation is much more complex
        if identity >= 100.0:
            return 1e-100
        elif identity >= 90.0:
            return 1e-50
        elif identity >= 80.0:
            return 1e-30
        elif identity >= 70.0:
            return 1e-20
        elif identity >= 60.0:
            return 1e-10
        elif identity >= 50.0:
            return 1e-5
        elif identity >= 40.0:
            return 1e-2
        else:
            return 10.0
    
    @staticmethod
    def normalize_colabfold_results(results: Dict[str, Any], query_sequence: str, e_value: float = None) -> Dict[str, Any]:
        """Normalize ColabFold MSA results to the unified schema."""
        metadata = {
            "search_type": "colabfold",
            "timestamp": datetime.now().isoformat(),
            "query_info": {
                "id": "query",
                "length": len(query_sequence)
            }
        }
        
        # Add e_value to metadata if provided
        if e_value is not None:
            metadata["search_parameters"] = {
                "e_value": e_value
            }
            normalized = {
                "metadata": metadata,
                "alignments": {
                    "databases": {}
                },
                "msa": {
                    "format": "fasta",
                    "sequences": [
                        {
                            "id": "query",
                            "name": "Query",
                            "sequence": query_sequence,
                            "identity": 100.0,
                            "evalue": 0.0,
                            "database": "query"
                        }
                    ]
                }
            }# Process alignments from each database
        for db_name, db_data in results.get("alignments", {}).items():
            if not db_data.get("fasta", {}).get("alignment"):
                continue

            # Parse FASTA alignment
            sequences = []
            current_seq = {"id": "", "sequence": "", "database": db_name}
            
            for line in db_data["fasta"]["alignment"].split("\n"):
                if line.startswith(">"):
                    if current_seq["id"]:
                        # Calculate identity and e-value before adding sequence
                        identity = MSASchemaNormalizer._calculate_sequence_identity(
                            query_sequence, current_seq["sequence"]
                        )
                        estimated_evalue = MSASchemaNormalizer._estimate_evalue(
                            identity, len(query_sequence), len(current_seq["sequence"])
                        )
                        
                        # Add calculated values to sequence
                        current_seq["identity"] = identity
                        current_seq["evalue"] = estimated_evalue
                        current_seq["name"] = current_seq["id"]  # Add name field
                        
                        sequences.append(current_seq)
                    
                    # Parse header - handle database prefixes like tr|, sp|, etc.
                    header = line[1:]
                    if "|" in header:
                        parts = header.split("|")
                        if len(parts) >= 2 and parts[0] in ['tr', 'sp', 'gb', 'ref', 'pdb']:
                            seq_id = parts[1]  # Use actual accession, not prefix
                        else:
                            seq_id = parts[0]
                    else:
                        seq_id = header
                    
                    current_seq = {
                        "id": seq_id,
                        "sequence": "",
                        "database": db_name
                    }
                else:
                    current_seq["sequence"] += line.strip()
            
            # Don't forget the last sequence
            if current_seq["id"]:
                identity = MSASchemaNormalizer._calculate_sequence_identity(
                    query_sequence, current_seq["sequence"]
                )
                estimated_evalue = MSASchemaNormalizer._estimate_evalue(
                    identity, len(query_sequence), len(current_seq["sequence"])
                )
                
                current_seq["identity"] = identity
                current_seq["evalue"] = estimated_evalue
                current_seq["name"] = current_seq["id"]
                
                sequences.append(current_seq)

            # Add sequences to MSA
            normalized["msa"]["sequences"].extend(sequences)

            # Create hit data for alignments section
            hits = []
            for seq in sequences:
                hit_data = {
                    "id": seq["id"],
                    "accession": seq["id"],
                    "description": seq.get("name", seq["id"]),
                    "length": len(seq["sequence"].replace('-', '')),  # Length without gaps
                    "score": 0,  # ColabFold doesn't provide bit scores
                    "evalue": seq["evalue"],
                    "identity": seq["identity"],
                    "coverage": 0,  # Could be calculated if needed
                    "alignments": [{
                        "query_seq": query_sequence,
                        "target_seq": seq["sequence"],
                        "midline": "",  # Could generate alignment midline if needed
                        "query_start": 1,
                        "query_end": len(query_sequence),
                        "target_start": 1,
                        "target_end": len(seq["sequence"].replace('-', ''))
                    }]
                }
                hits.append(hit_data)

            # Add database info
            normalized["alignments"]["databases"][db_name] = {
                "hits": hits,
                "total_hits": len(sequences)
            }

        return normalized    
    
    @staticmethod
    def normalize_blast_results(results: Dict[str, Any], query_sequence: str, e_value: float = None) -> Dict[str, Any]:
        """Normalize BLAST results to the unified schema."""
        metadata = {
            "search_type": "blast",
            "timestamp": datetime.now().isoformat(),
            "query_info": {
                "id": "query",
                "length": len(query_sequence)
            }
        }
        
        # Add e_value to metadata if provided
        if e_value is not None:
            metadata["search_parameters"] = {
                "e_value": e_value
            }
        
        normalized = {
            "metadata": metadata,
            "alignments": {
                "databases": {
                    "blast": {
                        "hits": [],
                        "total_hits": len(results.get("hits", []))
                    }
                }
            },
            "msa": {
                "format": "fasta",
                "sequences": [
                    {
                        "id": "query",
                        "name": "Query",
                        "sequence": query_sequence,
                        "identity": 100.0,
                        "database": "blast"
                    }
                ]
            }
        }

        # Process hits
        for hit in results.get("hits", []):
            if not hit.get("hsps"):
                continue

            hsp = hit["hsps"][0]
            hit_data = {
                "id": hit.get("id", ""),
                "accession": hit.get("accession", ""),
                "description": hit.get("def", ""),
                "length": int(hit.get("len", 0)),
                "score": float(hsp.get("score", 0)),
                "evalue": float(hsp.get("evalue", 0)),
                "identity": float(hsp.get("identity", 0)),
                "coverage": 0,  # Calculate if needed
                "alignments": [{
                    "query_seq": hsp.get("qseq", ""),
                    "target_seq": hsp.get("hseq", ""),
                    "midline": hsp.get("midline", ""),
                    "query_start": int(hsp.get("query_from", 0)),
                    "query_end": int(hsp.get("query_to", 0)),
                    "target_start": int(hsp.get("hit_from", 0)),
                    "target_end": int(hsp.get("hit_to", 0))
                }]
            }
            normalized["alignments"]["databases"]["blast"]["hits"].append(hit_data)

            # Add to MSA sequences
            normalized["msa"]["sequences"].append({
                "id": hit.get("id", ""),
                "name": hit.get("def", ""),
                "sequence": hsp.get("hseq", ""),
                "identity": float(hsp.get("identity", 0)),
                "database": "blast"
            })

        return normalized    
    
    @staticmethod
    def normalize_foldseek_results(results: Dict[str, Any], query_sequence: str, e_value: float = None) -> Dict[str, Any]:
        """Normalize FoldSeek results to the unified schema."""
        metadata = {
            "search_type": "foldseek",
            "timestamp": datetime.now().isoformat(),
            "query_info": {
                "id": "query",
                "length": len(query_sequence)
            }
        }
        
        # Add e_value to metadata if provided
        if e_value is not None:
            metadata["search_parameters"] = {
                "e_value": e_value
            }
        
        normalized = {
            "metadata": metadata,
            "alignments": {
                "databases": {}
            },
            "msa": {
                "format": "fasta",
                "sequences": [
                    {
                        "id": "query",
                        "name": "Query",
                        "sequence": query_sequence,
                        "identity": 100.0,
                        "database": "foldseek"
                    }
                ]
            }
        }

        # Process hits from each database
        for db_name, db_data in results.get("databases", {}).items():
            hits = []
            for hit in db_data.get("hits", []):
                hit_data = {
                    "id": hit.get("target", ""),
                    "accession": hit.get("target", ""),
                    "description": hit.get("description", ""),
                    "length": int(hit.get("length", 0)),
                    "score": float(hit.get("score", 0)),
                    "evalue": float(hit.get("evalue", 0)),
                    "identity": float(hit.get("identity", 0)),
                    "coverage": float(hit.get("coverage", 0)),
                    "alignments": [{
                        "query_seq": hit.get("query_seq", ""),
                        "target_seq": hit.get("target_seq", ""),
                        "midline": hit.get("midline", ""),
                        "query_start": int(hit.get("query_start", 0)),
                        "query_end": int(hit.get("query_end", 0)),
                        "target_start": int(hit.get("target_start", 0)),
                        "target_end": int(hit.get("target_end", 0))
                    }]
                }
                hits.append(hit_data)

                # Add to MSA sequences
                normalized["msa"]["sequences"].append({
                    "id": hit.get("target", ""),
                    "name": hit.get("description", ""),
                    "sequence": hit.get("target_seq", ""),
                    "identity": float(hit.get("identity", 0)),
                    "database": db_name
                })

            normalized["alignments"]["databases"][db_name] = {
                "hits": hits,
                "total_hits": len(hits)
            }

        return normalized 