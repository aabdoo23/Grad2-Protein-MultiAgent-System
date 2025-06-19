import os
import subprocess
import tempfile
import pandas as pd
import logging
import platform
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalBlastSearcher:
    def __init__(self):
        pass

    def _get_blastp_executable(self):
        """
        Get the appropriate blastp executable path based on the platform.
        Returns:
            str: Path to the blastp executable
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        if platform.system().lower() == 'windows':
            blastp_path = os.path.join(current_dir, 'blastp', 'blastp.exe')
        else:  # Linux/Unix
            blastp_path = os.path.join(current_dir, 'blastp-linux', 'blastp')
        
        if not os.path.exists(blastp_path):
            raise FileNotFoundError(f"BLAST executable not found at {blastp_path}")
        
        return blastp_path    
    
    @staticmethod
    def _make_midline(qseq, sseq):
        return ''.join('|' if a == b else ' ' for a, b in zip(qseq, sseq))

    def _format_blast_results(self, hits, query, db_name, e_value=None):
        # Prepare alignments for the frontend
        alignments = {
            "databases": {
                db_name: {
                    "hits": []
                }
            }
        }
        
        msa_sequences = [{
            "id": "Query",
            "name": "Query",
            "sequence": query,
            "identity": 100.0,
            "database": db_name
        }]

        for hit in hits:
            # Parse accession and description from subject_id
            subject_id = hit.get("subject_id", "")
            if "|" in subject_id:
                parts = subject_id.split("|")
                # Handle common database formats like "tr|A0A123|description" or "sp|P12345|description"
                if len(parts) >= 2 and parts[0] in ['tr', 'sp', 'gb', 'ref', 'pdb']:
                    # Use the actual accession (second part) and skip the database prefix
                    accession = parts[1]
                    description = "|".join(parts[2:]) if len(parts) > 2 else ""
                else:
                    # Fallback to original parsing
                    accession = parts[0]
                    description = "|".join(parts[1:])
            else:
                accession = subject_id
                description = ""

            msa_sequences.append({
                "id": accession,
                "name": accession,
                "sequence": hit.get("sseq", ""),  # Use the aligned subject sequence
                "identity": hit.get("percent_identity", 0.0),
                "database": db_name
            })

            alignments["databases"][db_name]["hits"].append({
                "id": accession,
                "description": description,
                "accession": accession,
                "length": hit.get("alignment_length"),
                "identity": hit.get("percent_identity"),
                "score": hit.get("bit_score"),
                "evalue": hit.get("e_value"),
                "alignments": [
                    {
                        "query_seq": hit.get("qseq", query),
                        "target_seq": hit.get("sseq", ""),
                        "midline": self._make_midline(hit.get("qseq", ""), hit.get("sseq", ""))
                    }
                ]
            })

        result = {
            "alignments": alignments,
            "msa": {
                "sequences": msa_sequences
            }
        }
        
        # Add e_value to metadata if provided
        if e_value is not None:
            result["metadata"] = {
                "search_parameters": {
                    "e_value": e_value
                }
            }
        
        return result

    def search(self, sequence, db_path, e_value=0.0001, interpro_ids=None):
        """
        Perform a BLAST search using a local database.
        Args:
            sequence (str): The query sequence
            db_path (str): Path to the BLAST database
            e_value (float): E-value threshold for hits
            interpro_ids (list): Optional list of InterPro IDs to filter results
        Returns:
            dict: Search results
        """
        try:
            # Validate inputs
            if not sequence:
                return {"success": False, "error": "No sequence provided"}
            if not db_path:
                return {"success": False, "error": "No database path provided"}
            required_exts = ['.psq', '.pin', '.phr']
            if not all(os.path.exists(os.path.normpath(db_path + ext)) for ext in required_exts):
                return {"success": False, "error": f"Database files not found for {db_path} (expected .psq, .pin, .phr)"}

            # Create temporary FASTA file for query sequence
            with tempfile.NamedTemporaryFile(mode='w', suffix='.fasta', delete=False) as temp_fasta:
                temp_fasta.write(f">query\n{sequence}\n")
                query_file = temp_fasta.name

            try:
                # Get the appropriate blastp executable
                blastp_exec = self._get_blastp_executable()
                
                # Run BLAST search
                blast_cmd = [
                    blastp_exec,
                    '-query', query_file,
                    '-db', db_path,
                    '-outfmt', '6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore qseq sseq',
                    '-evalue', str(e_value)
                ]

                result = subprocess.run(blast_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    return {"success": False, "error": f"BLAST search failed: {result.stderr}"}

                # Parse results
                hits = []
                for line in result.stdout.splitlines():
                    fields = line.split('\t')
                    if len(fields) >= 14:
                        hit = {
                            'query_id': fields[0],
                            'subject_id': fields[1],
                            'percent_identity': float(fields[2]),
                            'alignment_length': int(fields[3]),
                            'mismatches': int(fields[4]),
                            'gap_opens': int(fields[5]),
                            'query_start': int(fields[6]),
                            'query_end': int(fields[7]),
                            'subject_start': int(fields[8]),
                            'subject_end': int(fields[9]),
                            'e_value': float(fields[10]),
                            'bit_score': float(fields[11]),
                            'qseq': fields[12],
                            'sseq': fields[13]
                        }
                        hits.append(hit)

                # Filter by InterPro IDs if provided
                if interpro_ids:
                    filtered_hits = []
                    for hit in hits:
                        # Add logic here to filter hits based on InterPro IDs
                        # This would require additional database queries or metadata
                        pass
                    hits = filtered_hits
                formatted_results = self._format_blast_results(hits, sequence, os.path.basename(db_path), e_value)
                return {
                    "success": True,
                    "results": formatted_results
                }
            finally:
                # Clean up temporary files
                if os.path.exists(query_file):
                    os.unlink(query_file)
        except Exception as e:
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
