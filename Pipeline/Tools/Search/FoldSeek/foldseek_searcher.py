import os
import time
import requests
import json
from typing import Dict, Any

class FoldseekSearcher:
    def __init__(self):
        self.base_url = "https://search.foldseek.com/api"
        self.default_databases = ['afdb50', 'afdb-swissprot', 'pdb100']
        self.visualization_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'static', 'pdb_files')
        os.makedirs(self.visualization_dir, exist_ok=True)

    def submit_search(self, pdb_file_path: str) -> Dict[str, Any]:
        if not os.path.exists(pdb_file_path):
            print(f"PDB file not found: {pdb_file_path}")
            return {"success": False, "error": f"PDB file not found: {pdb_file_path}"}
        with open(pdb_file_path, "rb") as f:
            files = {"q": ("query.file", f)}
            data = {"mode": "3diaa", "database[]": self.default_databases}
            res = requests.post(f"{self.base_url}/ticket", files=files, data=data).json()
        if "id" in res:
            return {"success": True, "ticket_id": res["id"]}
        return {"success": False, "error": "Failed to get ticket ID."}

    def check_status(self, ticket_id: str) -> Dict[str, Any]:
        res = requests.get(f"{self.base_url}/ticket/{ticket_id}").json()
        status = res.get("status")
        if status in ["RUNNING", "COMPLETE"]:
            return {"success": True, "status": status, "results": res if status == "COMPLETE" else None}
        return {"success": False, "error": f"Unexpected status: {status}"}
    
    def _process_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Process and format the search results."""
        processed_results = {
            "success": True,
            "databases": {}
        }
        
        for db_result in results.get("results", []):
            db_name = db_result.get("db")
            if not db_name:
                continue
                
            # Get top 3 hits
            top_hits = []
            for alignment in db_result.get("alignments", [])[:3]:
                for hit in alignment:
                    target = hit.get("target", "Unknown")
                    if db_name == "pdb100":
                        target_id = target.split("-")[0]
                    else:
                        target_id = target.split(" ")[0]
                    hit_data = {
                        "target": target,
                        "target_id": target_id,
                        "seqId": hit.get("seqId", 0),
                        "alnLength": hit.get("alnLength", 0),
                        "score": hit.get("score", 0),
                        "eval": hit.get("eval", 0),
                        "prob": hit.get("prob", 0),
                        "qAln": hit.get("qAln", ""),
                        "dbAln": hit.get("dbAln", ""),
                        "tSeq": hit.get("tSeq", ""),
                        "taxName": hit.get("taxName", "Unknown"),
                        # "visualization": self._create_visualization(hit.get("tSeq", ""), hit.get("target", "Unknown"))
                    }
                    top_hits.append(hit_data)
            
            processed_results["databases"][db_name] = {
                "hits": top_hits,
                "total_hits": len(db_result.get("alignments", []))
            }
        
        return processed_results
    
    def wait_for_results(self, ticket_id: str, max_wait: int = 300, interval: int = 10) -> Dict[str, Any]:
        start = time.time()
        while time.time() - start < max_wait:
            status = self.check_status(ticket_id)
            if status.get("status") == "COMPLETE":
                return {"success": True, "results": status["results"]}
            if not status["success"]:
                return status
            time.sleep(interval)
        return {"success": False, "error": "Timeout waiting for results."}

    def get_results(self, ticket_id: str) -> Dict[str, Any]:
        try:
            response = requests.get(f"{self.base_url}/result/{ticket_id}/0")
            # Check if response is successful and not empty
            if response.status_code != 200:
                return {"success": False, "error": f"API returned error code: {response.status_code}"}
            if not response.text:
                return {"success": False, "error": "Empty response from FoldSeek API"}
            
            # Try to parse JSON
            res = response.json()
            processed_results = self._process_results(res)
            return {"success": True, "results": processed_results}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Request error: {str(e)}"}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parsing error: {str(e)}, Response content: {response.text[:100]}..."}
        except Exception as e:
            return {"success": False, "error": f"Unexpected error: {str(e)}"}

    def download_pdb(self, target_id: str, database: str) -> Dict[str, Any]:
        """Download PDB file from either RCSB or AlphaFold database.
        
        Args:
            target_id (str): The target ID to download
            database (str): The database name ('pdb100' or 'afdb50'/'afdb-swissprot')
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - success: bool indicating if download was successful
                - pdb_file: Path to the downloaded PDB file if successful
                - error: Error message if unsuccessful
        """
        try:
            # Determine the download URL based on the database
            if database == 'pdb100':
                url = f"https://files.rcsb.org/download/{target_id}.pdb"
            else:  # AlphaFold database
                url = f"https://alphafold.ebi.ac.uk/files/{target_id}.pdb"
            
            # Download the PDB file
            response = requests.get(url)
            if response.status_code != 200:
                return {"success": False, "error": f"Failed to download PDB file: HTTP {response.status_code}"}
            
            # Save the PDB file
            pdb_path = os.path.join(self.visualization_dir, f"{target_id}.pdb")
            with open(pdb_path, "w", encoding="utf-8") as f:
                f.write(response.text)
            
            return {"success": True, "pdb_file": pdb_path}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
