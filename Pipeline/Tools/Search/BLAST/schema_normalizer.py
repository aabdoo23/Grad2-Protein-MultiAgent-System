from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MSASchemaNormalizer:
    @staticmethod
    def normalize_colabfold_results(results: Dict[str, Any], query_sequence: str) -> Dict[str, Any]:
        """Normalize ColabFold MSA results to the unified schema."""
        normalized = {
            "metadata": {
                "search_type": "colabfold",
                "timestamp": datetime.now().isoformat(),
                "query_info": {
                    "id": "query",
                    "length": len(query_sequence)
                }
            },
            "alignments": {
                "databases": {}
            },
            "msa": {
                "format": "fasta",
                "sequences": []
            }
        }

        # Process alignments from each database
        for db_name, db_data in results.get("alignments", {}).items():
            if not db_data.get("fasta", {}).get("alignment"):
                continue

            # Parse FASTA alignment
            sequences = []
            current_seq = {"id": "", "sequence": "", "database": db_name}
            
            for line in db_data["fasta"]["alignment"].split("\n"):
                if line.startswith(">"):
                    if current_seq["id"]:
                        sequences.append(current_seq)
                    current_seq = {
                        "id": line[1:].split("|")[0],
                        "sequence": "",
                        "database": db_name
                    }
                else:
                    current_seq["sequence"] += line.strip()
            
            if current_seq["id"]:
                sequences.append(current_seq)

            # Add sequences to MSA
            normalized["msa"]["sequences"].extend(sequences)

            # Add database info
            normalized["alignments"]["databases"][db_name] = {
                "hits": [],
                "total_hits": len(sequences)
            }

        return normalized

    @staticmethod
    def normalize_blast_results(results: Dict[str, Any], query_sequence: str) -> Dict[str, Any]:
        """Normalize BLAST results to the unified schema."""
        normalized = {
            "metadata": {
                "search_type": "blast",
                "timestamp": datetime.now().isoformat(),
                "query_info": {
                    "id": "query",
                    "length": len(query_sequence)
                }
            },
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
    def normalize_foldseek_results(results: Dict[str, Any], query_sequence: str) -> Dict[str, Any]:
        """Normalize FoldSeek results to the unified schema."""
        normalized = {
            "metadata": {
                "search_type": "foldseek",
                "timestamp": datetime.now().isoformat(),
                "query_info": {
                    "id": "query",
                    "length": len(query_sequence)
                }
            },
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