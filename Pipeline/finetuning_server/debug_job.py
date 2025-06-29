#!/usr/bin/env python3
"""
Simple test to debug job creation and storage.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def debug_job_creation():
    """Debug job creation step by step."""
    print("🔍 Debug: Job Creation")
    print("=" * 30)
    
    # Step 1: Check initial storage
    print("\n1. Initial storage:")
    response = requests.get(f"{BASE_URL}/debug/storage")
    if response.status_code == 200:
        storage = response.json()
        print(f"   Jobs in storage: {len(storage.get('job_storage', {}))}")
        print(f"   User jobs: {storage.get('user_jobs', {})}")
    
    # Step 2: Create a job
    print("\n2. Creating fine-tuning job...")
    finetune_request = {
        "model_key": "protgpt2",
        "fasta_content": ">protein1\nMKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG",
        "user_id": "debug_user",
        "finetune_mode": "qlora",
        "n_trials": 3
    }
    
    response = requests.post(f"{BASE_URL}/finetune", json=finetune_request)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        job_id = result.get("job_id")
        print(f"   Job ID: {job_id}")
        
        # Step 3: Check storage immediately after creation
        print("\n3. Storage after job creation:")
        response = requests.get(f"{BASE_URL}/debug/storage")
        if response.status_code == 200:
            storage = response.json()
            print(f"   Jobs in storage: {len(storage.get('job_storage', {}))}")
            print(f"   User jobs: {storage.get('user_jobs', {})}")
            
            # Check if our job is there
            if job_id in storage.get('job_storage', {}):
                job_data = storage['job_storage'][job_id]
                print(f"   Our job status: {job_data.get('status')}")
            else:
                print("   ❌ Our job not found in storage")
        
        # Step 4: Wait and check again
        print("\n4. Waiting 8 seconds and checking again...")
        time.sleep(8)
        
        response = requests.get(f"{BASE_URL}/debug/storage")
        if response.status_code == 200:
            storage = response.json()
            print(f"   Jobs in storage: {len(storage.get('job_storage', {}))}")
            print(f"   User jobs: {storage.get('user_jobs', {})}")
            
            if job_id in storage.get('job_storage', {}):
                job_data = storage['job_storage'][job_id]
                print(f"   Our job status: {job_data.get('status')}")
            else:
                print("   ❌ Our job still not found in storage")
        
        # Step 5: Check user models endpoint
        print("\n5. Checking user models endpoint:")
        response = requests.get(f"{BASE_URL}/models/finetuned/debug_user")
        if response.status_code == 200:
            result = response.json()
            print(f"   Models found: {len(result.get('models', []))}")
            for model in result.get('models', []):
                print(f"   - {model.get('model_key')} (Status: {model.get('status')})")
        else:
            print(f"   ❌ Failed to get models: {response.status_code}")
            
    else:
        print(f"   ❌ Failed to create job: {response.text}")

if __name__ == "__main__":
    debug_job_creation()
