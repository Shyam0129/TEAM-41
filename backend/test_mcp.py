"""
Quick test script for MCP endpoints.
Run this after starting the backend to verify MCP integration.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
# Replace with your actual JWT token after signing in
JWT_TOKEN = "YOUR_JWT_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

def test_mcp_methods():
    """Test getting available MCP methods."""
    print("\n" + "="*60)
    print("Testing: GET /mcp/methods")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/mcp/methods", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Found {data['count']} MCP methods:")
        for method in data['methods']:
            print(f"  - {method}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def test_gmail_unread():
    """Test getting unread Gmail messages."""
    print("\n" + "="*60)
    print("Testing: GET /mcp/gmail/unread")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/mcp/gmail/unread",
        headers=headers,
        params={"max_results": 5}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Found {data['count']} unread messages")
        for msg in data['messages'][:3]:  # Show first 3
            print(f"  - From: {msg.get('from', 'Unknown')}")
            print(f"    Subject: {msg.get('subject', 'No subject')}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def test_calendar_today():
    """Test getting today's calendar events."""
    print("\n" + "="*60)
    print("Testing: GET /mcp/calendar/today")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/mcp/calendar/today", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Found {data['count']} events today")
        for event in data['events'][:3]:  # Show first 3
            print(f"  - {event.get('summary', 'No title')}")
            print(f"    Time: {event.get('start', {}).get('dateTime', 'All day')}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

def test_gmail_search():
    """Test searching Gmail."""
    print("\n" + "="*60)
    print("Testing: POST /mcp/gmail/search")
    print("="*60)
    
    payload = {
        "query": "is:unread",
        "max_results": 5
    }
    
    response = requests.post(
        f"{BASE_URL}/mcp/gmail/search",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success! Found {data['count']} messages matching '{data['query']}'")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    print("\n🚀 MCP Integration Test Suite")
    print("="*60)
    
    if JWT_TOKEN == "YOUR_JWT_TOKEN_HERE":
        print("\n⚠️  WARNING: Please update JWT_TOKEN in this script!")
        print("   1. Sign in at http://localhost:3000")
        print("   2. Open browser console")
        print("   3. Run: localStorage.getItem('access_token')")
        print("   4. Copy the token and paste it in this script")
        print("\n   Then run this script again.")
    else:
        # Run all tests
        test_mcp_methods()
        test_gmail_unread()
        test_calendar_today()
        test_gmail_search()
        
        print("\n" + "="*60)
        print("✅ MCP Integration Test Complete!")
        print("="*60 + "\n")
