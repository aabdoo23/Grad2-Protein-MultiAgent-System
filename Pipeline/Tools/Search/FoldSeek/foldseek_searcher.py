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

    def download_results(self, ticket_id: str) -> Dict[str, Any]:
        res = requests.get(f"{self.base_url}/result/download/{ticket_id}").json()
        if res.get("status") == "COMPLETE":
            return {"success": True, "results": res}
        return {"success": False, "error": f"Search not complete: {res.get('status')}"}
