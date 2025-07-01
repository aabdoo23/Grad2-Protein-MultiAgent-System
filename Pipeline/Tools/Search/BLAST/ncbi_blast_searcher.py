import requests
import time
import re
from typing import Dict, Any
from bs4 import BeautifulSoup
import logging
from .schema_normalizer import MSASchemaNormalizer
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NCBI_BLAST_Searcher:
    def __init__(self):
        self.base_url = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"
        self.default_program = "blastp"
        self.default_database = "nr"
        self.max_wait_time = 600  # 10 minutes
        self.poll_interval = 15   # 15 seconds
        self.schema_normalizer = MSASchemaNormalizer()

    def submit_search(self, sequence: str) -> Dict[str, Any]:
        """Submit a BLAST search and return the RID (Request ID).
        
        Args:
            sequence (str): The protein sequence to search
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if submission was successful
                - rid: Request ID if successful
                - error: Error message if unsuccessful
        """
        try:
            # Submit BLAST query
            params = {
                "CMD": "Put",
                "PROGRAM": self.default_program,
                "DATABASE": self.default_database,
                "QUERY": sequence
            }
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            # Parse RID from response
            soup = BeautifulSoup(response.text, 'html.parser')
            rid_element = soup.find('input', {'name': 'RID'})
            
            if not rid_element or not rid_element.get('value'):
                logger.error("Failed to find RID in BLAST response")
                return {"success": False, "error": "Failed to retrieve RID from BLAST response"}
                
            rid = rid_element['value']
            logger.info(f"BLAST search submitted successfully. RID: {rid}")
            return {"success": True, "rid": rid}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error during BLAST submission: {str(e)}")
            return {"success": False, "error": f"Request error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error during BLAST submission: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_status(self, rid: str) -> Dict[str, Any]:
        """Check the status of a BLAST search.
        
        Args:
            rid (str): The Request ID
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if status check was successful
                - status: Current status ('WAITING', 'READY', or 'FAILED')
                - error: Error message if unsuccessful
        """
        try:
            params = {
                "CMD": "Get",
                "FORMAT_OBJECT": "SearchInfo",
                "RID": rid
            }
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            if "Status=READY" in response.text:
                logger.info(f"BLAST search {rid} is ready")
                return {"success": True, "status": "READY"}
            elif "Status=WAITING" in response.text:
                logger.info(f"BLAST search {rid} is still running")
                return {"success": True, "status": "WAITING"}
            else:
                logger.error(f"Unexpected status response for BLAST search {rid}")
                return {"success": False, "status": "FAILED", "error": "Unexpected status response"}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error checking BLAST status: {str(e)}")
            return {"success": False, "error": f"Request error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error checking BLAST status: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_results(self, rid: str) -> Dict[str, Any]:
        """Get the results of a completed BLAST search.
        
        Args:
            rid (str): The Request ID
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if results retrieval was successful
                - results: Processed BLAST results if successful
                - error: Error message if unsuccessful
        """
        try:
            params = {
                "CMD": "Get",
                "FORMAT_TYPE": "XML",
                "RID": rid
            }
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            # Process XML results
            results = self._process_xml_results(response.text)
            
            logger.info(f"Successfully retrieved results for BLAST search {rid}")
            return {"success": True, "results": results}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error retrieving BLAST results: {str(e)}")
            return {"success": False, "error": f"Request error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error retrieving BLAST results: {str(e)}")
            return {"success": False, "error": str(e)}

    def _process_xml_results(self, xml_text: str) -> Dict[str, Any]:
        """Process BLAST XML results into a structured format.
        
        Args:
            xml_text (str): Raw XML response from BLAST
            
        Returns:
            Dict[str, Any]: Processed results containing:
                - hits: List of hit information
                - statistics: Search statistics
                - query: Query sequence
        """
        try:
            # Use lxml parser explicitly
            soup = BeautifulSoup(xml_text, 'lxml-xml')
            
            # Extract query sequence
            query = soup.find('BlastOutput_query-seq')
            query_seq = query.text if query else ''
            
            # Extract hits
            hits = []
            for hit in soup.find_all('Hit'):
                hit_len_elem = hit.find('Hit_len')
                hit_len_value = int(hit_len_elem.text) if hit_len_elem and hit_len_elem.text else 0
                
                hit_data = {
                    'id': hit.find('Hit_id').text if hit.find('Hit_id') else '',
                    'def': hit.find('Hit_def').text if hit.find('Hit_def') else '',
                    'accession': hit.find('Hit_accession').text if hit.find('Hit_accession') else '',
                    'len': hit.find('Hit_len').text if hit.find('Hit_len') else '',
                    'hsps': []
                }
                # Extract HSPs (High-scoring Segment Pairs)
                for hsp in hit.find_all('Hsp'):
                    identity_elem = hsp.find('Hsp_identity')
                    identity_value = ''
                    if identity_elem and identity_elem.text and hit_len_value > 0:
                        try:
                            identity_value = float(identity_elem.text) / hit_len_value * 100
                        except (ValueError, ZeroDivisionError):
                            identity_value = ''

                    hsp_data = {
                        'bit_score': hsp.find('Hsp_bit-score').text if hsp.find('Hsp_bit-score') else '',
                        'score': hsp.find('Hsp_score').text if hsp.find('Hsp_score') else '',
                        'evalue': hsp.find('Hsp_evalue').text if hsp.find('Hsp_evalue') else '',
                        'query_from': hsp.find('Hsp_query-from').text if hsp.find('Hsp_query-from') else '',
                        'query_to': hsp.find('Hsp_query-to').text if hsp.find('Hsp_query-to') else '',
                        'hit_from': hsp.find('Hsp_hit-from').text if hsp.find('Hsp_hit-from') else '',
                        'hit_to': hsp.find('Hsp_hit-to').text if hsp.find('Hsp_hit-to') else '',
                        'identity': identity_value,
                        'positive': hsp.find('Hsp_positive').text if hsp.find('Hsp_positive') else '',
                        'gaps': hsp.find('Hsp_gaps').text if hsp.find('Hsp_gaps') else '',
                        'align_len': hsp.find('Hsp_align-len').text if hsp.find('Hsp_align-len') else '',
                        'qseq': hsp.find('Hsp_qseq').text if hsp.find('Hsp_qseq') else '',
                        'hseq': hsp.find('Hsp_hseq').text if hsp.find('Hsp_hseq') else '',
                        'midline': hsp.find('Hsp_midline').text if hsp.find('Hsp_midline') else ''
                    }
                    hit_data['hsps'].append(hsp_data)
                
                hits.append(hit_data)
            
            # Extract statistics
            stats = {}
            stats_elem = soup.find('Statistics')
            if stats_elem:
                stats = {
                    'db_num': stats_elem.find('Statistics_db-num').text if stats_elem.find('Statistics_db-num') else '',
                    'db_len': stats_elem.find('Statistics_db-len').text if stats_elem.find('Statistics_db-len') else '',
                    'hsp_len': stats_elem.find('Statistics_hsp-len').text if stats_elem.find('Statistics_hsp-len') else '',
                    'eff_space': stats_elem.find('Statistics_eff-space').text if stats_elem.find('Statistics_eff-space') else '',
                    'kappa': stats_elem.find('Statistics_kappa').text if stats_elem.find('Statistics_kappa') else '',
                    'lambda': stats_elem.find('Statistics_lambda').text if stats_elem.find('Statistics_lambda') else '',
                    'entropy': stats_elem.find('Statistics_entropy').text if stats_elem.find('Statistics_entropy') else ''
                }
            
            # If query sequence is empty, try to get it from the first HSP
            if not query_seq and hits and hits[0]['hsps']:
                query_seq = hits[0]['hsps'][0]['qseq']
            
            return {
                'hits': hits,
                'statistics': stats,
                'query': query_seq
            }
            
        except Exception as e:
            logger.error(f"Error processing XML results: {str(e)}")
            raise

    def search(self, sequence: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        if not sequence:
            return {"success": False, "error": "No sequence provided"}
            
        try:
            # Use parameters from the job if provided, otherwise use defaults
            e_value = parameters.get("e_value", 0.0001) if parameters else 0.0001
            database = parameters.get("database", "nr") if parameters else "nr"
            sequence = sequence.replace(" ", "")
            
            # Submit the BLAST search using the existing submit_search method
            submit_result = self.submit_search(sequence)
            if not submit_result["success"]:
                return submit_result
                
            rid = submit_result["rid"]
            
            # Poll for results
            max_attempts = 30
            polling_interval = 10
            attempts = 0
            
            while attempts < max_attempts:
                attempts += 1
                time.sleep(polling_interval)
                  # Check the status using the existing check_status method
                status_result = self.check_status(rid)
                if not status_result["success"]:
                    return status_result
                    
                if status_result["status"] == "READY":
                    # Get the results using the existing get_results method
                    results = self.get_results(rid)
                    if results["success"]:
                        # Normalize results using the schema normalizer
                        normalized_results = self.schema_normalizer.normalize_blast_results(results["results"], sequence, e_value)
                        return {"success": True, "results": normalized_results}
                    else:
                        return {"success": False, "error": results.get("error", "Failed to get results")}
                elif status_result["status"] == "FAILED":
                    return {"success": False, "error": "BLAST search failed"}
                # If still running, continue polling
                
            return {"success": False, "error": "BLAST search timed out"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_results(self, rid: str) -> Dict[str, Any]:
        """Check the status and get results of a BLAST search.
        
        Args:
            rid (str): The Request ID
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if check was successful
                - status: Current status ('submitted', 'running', 'completed', 'failed')
                - results: Processed BLAST results if completed                - error: Error message if unsuccessful
        """
        try:
            status_result = self.check_status(rid)
            
            if not status_result['success']:
                return {
                    "success": False,
                    "status": "failed",
                    "error": status_result.get('error', 'Unknown error')
                }
                
            if status_result['status'] == 'READY':
                results = self.get_results(rid)
                if results['success']:
                    # Normalize results using the schema normalizer
                    # Note: e_value parameter not available in check_results context, using None
                    normalized_results = self.schema_normalizer.normalize_blast_results(results['results'], results['results'].get('query', ''), None)
                    
                    return {
                        "success": True,
                        "status": "completed",
                        "results": normalized_results
                    }
                else:
                    return {
                        "success": False,
                        "status": "failed",
                        "error": results.get('error', 'Failed to get results')
                    }
            elif status_result['status'] == 'WAITING':
                return {
                    "success": True,
                    "status": "running",
                    "message": "BLAST search is still running"
                }
            else:
                return {
                    "success": False,
                    "status": "failed",
                    "error": "Unexpected status response"
                }
                
        except Exception as e:
            logger.error(f"Error checking BLAST results: {str(e)}")
            return {
                "success": False,
                "status": "failed",
                "error": str(e)
            } 