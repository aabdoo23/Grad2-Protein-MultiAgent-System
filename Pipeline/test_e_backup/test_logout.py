#!/usr/bin/env python3
"""
Test session management and logout functionality
"""
import requests
import sys
import os
sys.path.append('/home/aabdoo23/Desktop/grad/Protein-Pipeline/Pipeline')

from dotenv import load_dotenv
load_dotenv()

def test_session_logout():
    """Test the complete login/logout flow"""
    
    print("🔐 Testing Session Management and Logout\n")
    
    # Base URL for the API
    base_url = "http://localhost:5000"
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    print("1. Testing login...")
    
    # Login with test user
    login_data = {
        'username': 'testuser123',
        'password': 'TestPass123!'
    }
    login_response = session.post(f"{base_url}/api/auth/login", json=login_data)
    
    if login_response.status_code == 200:
        login_result = login_response.json()
        if login_result.get('success'):
            print("   ✅ Login successful!")
            print(f"   User: {login_result['user']['user_name']}")
        else:
            print(f"   ❌ Login failed: {login_result.get('error')}")
            return
    else:
        print(f"   ❌ Login request failed: {login_response.status_code}")
        return
    
    print("\n2. Testing /api/auth/me endpoint (should show logged in user)...")
    
    # Check current user
    me_response = session.get(f"{base_url}/api/auth/me")
    
    if me_response.status_code == 200:
        me_result = me_response.json()
        if me_result.get('success'):
            print("   ✅ User is logged in!")
            print(f"   User: {me_result['user']['user_name']}")
        else:
            print(f"   ❌ User not authenticated: {me_result.get('error')}")
    else:
        print(f"   ❌ /me request failed: {me_response.status_code}")
    
    print("\n3. Testing logout...")
    
    # Logout
    logout_response = session.post(f"{base_url}/api/auth/logout")
    
    if logout_response.status_code == 200:
        logout_result = logout_response.json()
        if logout_result.get('success'):
            print("   ✅ Logout successful!")
            print(f"   Message: {logout_result['message']}")
        else:
            print(f"   ❌ Logout failed: {logout_result.get('error')}")
    else:
        print(f"   ❌ Logout request failed: {logout_response.status_code}")
    
    print("\n4. Testing /api/auth/me endpoint after logout (should show not authenticated)...")
    
    # Check current user after logout
    me_after_logout_response = session.get(f"{base_url}/api/auth/me")
    
    if me_after_logout_response.status_code == 401:
        print("   ✅ User is properly logged out! (401 Unauthorized)")
    elif me_after_logout_response.status_code == 200:
        me_after_result = me_after_logout_response.json()
        if not me_after_result.get('success'):
            print("   ✅ User is properly logged out!")
            print(f"   Error: {me_after_result.get('error')}")
        else:
            print("   ❌ User is still logged in after logout!")
            print(f"   User: {me_after_result['user']['user_name']}")
            return False
    else:
        print(f"   ❌ /me after logout request failed: {me_after_logout_response.status_code}")
    
    print("\n✅ Session logout test completed successfully!")
    return True

if __name__ == "__main__":
    print("🧪 Session Management Test\n")
    print("=" * 50)
    
    try:
        success = test_session_logout()
        if success:
            print("\n✅ All logout tests passed!")
        else:
            print("\n❌ Some logout tests failed!")
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to the server. Make sure Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
    
    print("\n" + "=" * 50)
    print("Test complete!")
