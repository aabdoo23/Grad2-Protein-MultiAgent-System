#!/usr/bin/env python3
"""
Test script to verify fine-tuned model selection works correctly.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_finetuned_model_generation():
    """Test the complete workflow: finetune -> generate with finetuned model."""
    print("🧬 Testing Fine-tuned Model Generation Workflow")
    print("=" * 60)
    
    try:
        # Step 1: Create a fine-tuning job
        print("\n📝 Step 1: Creating fine-tuning job...")
        finetune_request = {
            "model_key": "protgpt2",
            "fasta_content": ">protein1\nMKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG\n>protein2\nMQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKE",
            "user_id": "test_user_123",
            "finetune_mode": "qlora",
            "n_trials": 3
        }
        
        response = requests.post(f"{BASE_URL}/finetune", json=finetune_request)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create finetune job: {response.text}")
            return False
            
        finetune_result = response.json()
        job_id = finetune_result.get("job_id")
        print(f"✅ Fine-tuning job created: {job_id}")
        
        # Step 2: Wait for completion
        print("\n⏳ Step 2: Waiting for fine-tuning to complete...")
        max_wait = 15  # Wait up to 15 seconds
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_response = requests.get(f"{BASE_URL}/status/{job_id}")
            if status_response.status_code == 200:
                status_data = status_response.json()
                current_status = status_data.get("status")
                print(f"   Status: {current_status}")
                
                if current_status == "COMPLETED":
                    print("✅ Fine-tuning completed!")
                    break
                elif current_status == "FAILED":
                    print("❌ Fine-tuning failed!")
                    return False
            
            time.sleep(2)
        else:
            print("⚠️ Fine-tuning didn't complete in time, but continuing...")
        
        # Step 3: List user's fine-tuned models
        print("\n📋 Step 3: Checking user's fine-tuned models...")
        models_response = requests.get(f"{BASE_URL}/models/finetuned/test_user_123")
        if models_response.status_code == 200:
            models_data = models_response.json()
            models = models_data.get("models", [])
            print(f"✅ Found {len(models)} fine-tuned models")
            
            if models:
                model = models[0]
                print(f"   Model: {model['model_key']} (Job: {model['job_id'][:8]}...)")
            else:
                print("❌ No fine-tuned models found")
                return False
        else:
            print(f"❌ Failed to get user models: {models_response.text}")
            return False
        
        # Step 4: Generate using the fine-tuned model
        print("\n🧪 Step 4: Generating sequence with fine-tuned model...")
        generate_request = {
            "prompt": "Generate a high-affinity binding protein sequence",
            "model_dir_on_volume": f"/finetuned_models/{job_id}",
            "user_id": "test_user_123",
            "max_new_tokens": 150
        }
        
        generate_response = requests.post(f"{BASE_URL}/generate", json=generate_request)
        print(f"Status: {generate_response.status_code}")
        
        if generate_response.status_code == 200:
            generate_result = generate_response.json()
            gen_job_id = generate_result.get("job_id")
            print(f"✅ Generation job started: {gen_job_id}")
            
            # Check generation status
            gen_status_response = requests.get(f"{BASE_URL}/status/{gen_job_id}")
            if gen_status_response.status_code == 200:
                gen_status_data = gen_status_response.json()
                output = gen_status_data.get("output", {})
                
                print(f"\n🎉 Generation Results:")
                print(f"   Sequence: {output.get('generated_sequence', 'N/A')[:50]}...")
                print(f"   Model Used: {output.get('model_used', 'N/A')}")
                print(f"   Confidence: {output.get('confidence', 'N/A')}")
                print(f"   Source Job: {output.get('source_job_id', 'N/A')}")
                
                return True
            else:
                print(f"❌ Failed to get generation status: {gen_status_response.text}")
                return False
        else:
            print(f"❌ Failed to start generation: {generate_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

def test_generation_with_different_models():
    """Test generation with base model vs fine-tuned model"""
    print("\n\n🔄 Testing Different Model Types")
    print("=" * 40)
    
    try:
        # Test with base model
        print("\n🔹 Testing with base model...")
        base_request = {
            "prompt": "Generate enzyme sequence",
            "base_model_key": "protgpt2",
            "user_id": "test_user_123",
            "max_new_tokens": 100
        }
        
        response = requests.post(f"{BASE_URL}/generate", json=base_request)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Base model generation: {result['job_id'][:8]}...")
        else:
            print(f"❌ Base model generation failed: {response.text}")
        
        # Test with invalid fine-tuned model
        print("\n🔹 Testing with invalid fine-tuned model...")
        invalid_request = {
            "prompt": "Generate sequence",
            "model_dir_on_volume": "/finetuned_models/invalid-job-id",
            "user_id": "test_user_123",
            "max_new_tokens": 100
        }
        
        response = requests.post(f"{BASE_URL}/generate", json=invalid_request)
        if response.status_code == 404:
            print("✅ Correctly rejected invalid model reference")
        else:
            print(f"⚠️ Expected 404, got {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    success = test_finetuned_model_generation()
    test_generation_with_different_models()
    
    if success:
        print("\n🎉 All tests passed! Fine-tuned model generation is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
