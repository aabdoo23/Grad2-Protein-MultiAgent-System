#!/usr/bin/env python3
"""
Test script to verify the finetuning server is working correctly.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint."""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_base_models():
    """Test the base models endpoint."""
    print("\n🔍 Testing base models endpoint...")
    response = requests.get(f"{BASE_URL}/models/base")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_finetune_job():
    """Test starting a finetune job."""
    print("\n🔍 Testing finetune job creation...")
    
    finetune_request = {
        "model_key": "protgpt2",
        "fasta_content": ">protein1\nMKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG",
        "user_id": "test_user",
        "finetune_mode": "qlora",
        "n_trials": 3
    }
    
    response = requests.post(f"{BASE_URL}/finetune", json=finetune_request)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        job_id = response.json().get("job_id")
        print(f"✅ Job created with ID: {job_id}")
        return job_id
    return None

def test_job_status(job_id):
    """Test getting job status."""
    print(f"\n🔍 Testing job status for job {job_id}...")
    response = requests.get(f"{BASE_URL}/status/{job_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_generate():
    """Test sequence generation."""
    print("\n🔍 Testing sequence generation...")
    
    generate_request = {
        "prompt": "Generate a protein sequence for enzyme activity",
        "base_model_key": "protgpt2",
        "user_id": "test_user",
        "max_new_tokens": 100
    }
    
    response = requests.post(f"{BASE_URL}/generate", json=generate_request)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        job_id = response.json().get("job_id")
        return job_id
    return None

def test_user_jobs(user_id):
    """Test getting user jobs."""
    print(f"\n🔍 Testing user jobs for user {user_id}...")
    response = requests.get(f"{BASE_URL}/jobs/user/{user_id}")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def main():
    """Run all tests."""
    print("🧬 Testing Protein Fine-tuning API Server")
    print("=" * 50)
    
    try:
        # Test basic endpoints
        if not test_health():
            print("❌ Health check failed!")
            return
            
        if not test_base_models():
            print("❌ Base models test failed!")
            return
        
        # Test finetune job creation
        finetune_job_id = test_finetune_job()
        if not finetune_job_id:
            print("❌ Finetune job creation failed!")
            return
        
        # Wait a moment for job processing
        print("\n⏳ Waiting 6 seconds for job processing...")
        time.sleep(6)
        
        # Test job status
        if not test_job_status(finetune_job_id):
            print("❌ Job status test failed!")
            return
        
        # Test generation
        generate_job_id = test_generate()
        if not generate_job_id:
            print("❌ Generation test failed!")
            return
        
        # Test user jobs
        if not test_user_jobs("test_user"):
            print("❌ User jobs test failed!")
            return
        
        print("\n✅ All tests passed! The finetuning server is working correctly.")
        print("🎉 You can now access:")
        print(f"   - API Docs: {BASE_URL}/docs")
        print(f"   - Health: {BASE_URL}/health")
        print(f"   - Base Models: {BASE_URL}/models/base")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure it's running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    main()
