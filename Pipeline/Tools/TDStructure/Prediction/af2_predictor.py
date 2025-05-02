#!/usr/bin/env python3
import os
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Variables
key = os.getenv("NVCF_RUN_KEY") or input("Paste the Run Key: ")
url = "https://health.api.nvidia.com/v1/biology/deepmind/alphafold2"
status_url = "https://health.api.nvidia.com/v1/status"

sequence = ("MVPSAGQLALFALGIVLAACQALENSTSPLSADPPVAAAVVSHFNDCPDSHTQFCFHGTCRFL"
    "VQEDKPACVCHSGYVGARCEHADLLAVVAASQKKQAITALVVVSIVALAVLIITCVLIHCCQVRKHCEWCR"
    "ALICRHEKPSALLKGRTACCHSETVV"
)
output_file = Path("output.json")

# Initial request
headers = {
    "content-type": "application/json",
    "Authorization": f"Bearer {key}",
    "NVCF-POLL-SECONDS": "300",
}
data = {
    "sequence": sequence,
    "algorithm": "mmseqs2",
    "e_value": 0.0001,
    "iterations": 1,
    "databases": ["small_bfd"],
    "relax_prediction": False,
    "skip_template_search" : True
}

print("Making request...")
response = requests.post(url, headers=headers, json=data)

# Check the status code
if response.status_code == 200:
    output_file.write_text(response.text)
    print(f"Response output to file: {output_file}")
elif response.status_code == 202:
    print("Request accepted...")
    # Extract reqId header
    req_id = response.headers.get("nvcf-reqid")

    # Poll the /status endpoint
    while True:
        print("Polling for response...")
        status_response = requests.get(f"{status_url}/{req_id}", headers=headers)

        if status_response.status_code != 202:
            output_file.write_text(status_response.text)
            print(f"Response output to file: {output_file}")
            break
else:
    print(f"Unexpected HTTP status: {response.status_code}")
    print(f"Response: {response.text}")
