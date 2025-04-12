import os
import time
import requests
from typing import Dict, Any

class FoldseekSearcher:
    def __init__(self):
        self.base_url = "https://search.foldseek.com/api"
        self.default_databases = ['afdb50', 'afdb-swissprot', 'pdb100']

    def submit_search(self, pdb_file_path: str) -> Dict[str, Any]:
        if not os.path.exists(pdb_file_path):
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
                    hit_data = {
                        "target": hit.get("target", "Unknown"),
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
        res = requests.get(f"{self.base_url}/result/{ticket_id}/0").json()
        res = self._process_results(res)
        print(res)
        return {"success": True, "results": res}
