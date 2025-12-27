"""
Quick test script for new authentication endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_register():
    """Test user registration"""
    print("\n" + "="*60)
    print("Testing: POST /auth/register")
    print("="*60)
    
    payload = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123!",
        "name": "Test User"
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json=payload
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print("✅ Registration successful!")
        print(f"User ID: {data['user']['user_id']}")
        print(f"Email: {data['user']['email']}")
        print(f"Username: {data['user']['username']}")
        print(f"Auth Provider: {data['user']['auth_provider']}")
        print(f"Access Token: {data['access_token'][:50]}...")
        print(f"Refresh Token: {data['refresh_token'][:50]}...")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None

def test_login(email, password):
    """Test user login"""
    print("\n" + "="*60)
    print("Testing: POST /auth/login")
    print("="*60)
    
    payload = {
        "email": email,
        "password": password
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=payload
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"User ID: {data['user']['user_id']}")
        print(f"Email: {data['user']['email']}")
        print(f"Access Token: {data['access_token'][:50]}...")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None

def test_refresh(refresh_token):
    """Test token refresh"""
    print("\n" + "="*60)
    print("Testing: POST /auth/refresh")
    print("="*60)
    
    payload = {
        "refresh_token": refresh_token
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/refresh",
        json=payload
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Token refresh successful!")
        print(f"New Access Token: {data['access_token'][:50]}...")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None

def test_me(access_token):
    """Test /auth/me endpoint"""
    print("\n" + "="*60)
    print("Testing: GET /auth/me")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Get current user successful!")
        print(f"User: {json.dumps(data, indent=2)}")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None

if __name__ == "__main__":
    print("\n🚀 Testing New Authentication System")
    print("="*60)
    
    # Test registration
    reg_data = test_register()
    
    if reg_data:
        # Test login
        login_data = test_login("test@example.com", "SecurePass123!")
        
        if login_data:
            # Test token refresh
            refresh_data = test_refresh(login_data['refresh_token'])
            
            # Test /auth/me with new token
            if refresh_data:
                test_me(refresh_data['access_token'])
    
    print("\n" + "="*60)
    print("✅ All Tests Complete!")
    print("="*60 + "\n")
