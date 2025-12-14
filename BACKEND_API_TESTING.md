# Backend API Testing - CURL Commands

> **Quick reference for testing all backend endpoints and tools**

---

## 📋 Table of Contents

- [Health Check](#health-check)
- [Chat Endpoint](#chat-endpoint)
- [Gmail Tool](#gmail-tool)
- [Slack Tool](#slack-tool)
- [Calendar Tool](#calendar-tool)
- [Docs Tool](#docs-tool)
- [SMS Tool](#sms-tool)
- [Conversation Management](#conversation-management)
- [Session Management](#session-management)
- [User Management](#user-management)

---

## 🏥 Health Check

### Check Backend Status
```bash
curl -X GET http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-14T11:45:00",
  "version": "1.0.0",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## 💬 Chat Endpoint

### Basic Chat Request
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Chat with Tool Selection (Gmail)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[Using Gmail] Send an email to test@example.com with subject Test and body Hello World",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Chat with Tool Selection (Slack)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[Using Slack] Send a message to #general saying Hello team!",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 📧 Gmail Tool

### Send Email
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send an email to john@example.com with subject Meeting Reminder and body Dont forget our meeting tomorrow at 2 PM",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Read Inbox
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me my latest emails",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Create Draft
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a draft email to team@company.com about the quarterly review",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Search Emails
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Search my emails for messages from john@example.com",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 💬 Slack Tool

### Send Message to Channel
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send a Slack message to #general channel: Deployment completed successfully!",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Send Message to Specific Channel
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Post in #dev-team: Code review needed for PR #123",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### List Channels
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all Slack channels",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 📅 Calendar Tool

### Create Event
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Schedule a meeting tomorrow at 2 PM for 1 hour titled Team Standup",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### List Events
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show my calendar for next week",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Update Event
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Reschedule the Team Standup meeting to 3 PM",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Delete Event
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Cancel the Team Standup meeting",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 📄 Docs Tool

### Generate PDF
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a PDF document with title Quarterly Report and content Sales increased by 25% this quarter",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Create Google Doc
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a Google Doc for meeting notes",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Extract Text from PDF
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Extract text from the uploaded PDF file",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 📱 SMS Tool

### Send SMS
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send an SMS to +1234567890 saying Your appointment is confirmed for tomorrow at 10 AM",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Send Bulk SMS
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send SMS to multiple numbers: +1234567890, +0987654321 with message Meeting rescheduled",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 🗂️ Conversation Management

### Create Conversation
```bash
curl -X POST "http://localhost:8000/api/conversations?user_id=user_test123&session_id=sess_test456&first_message=Hello" \
  -H "Content-Type: application/json"
```

### Get User Conversations
```bash
curl -X GET "http://localhost:8000/api/conversations?user_id=user_test123&limit=50&skip=0&include_archived=false"
```

### Get Specific Conversation
```bash
curl -X GET "http://localhost:8000/api/conversations/conv_abc123"
```

### Get Conversation Messages
```bash
curl -X GET "http://localhost:8000/api/conversations/conv_abc123/messages?limit=100"
```

### Update Conversation Title
```bash
curl -X PATCH "http://localhost:8000/api/conversations/conv_abc123?title=My%20Updated%20Title"
```

### Archive Conversation
```bash
curl -X POST "http://localhost:8000/api/conversations/conv_abc123/archive"
```

### Delete Conversation
```bash
curl -X DELETE "http://localhost:8000/api/conversations/conv_abc123"
```

---

## 🔐 Session Management

### Create Session
```bash
curl -X POST "http://localhost:8000/api/sessions?user_id=user_test123" \
  -H "Content-Type: application/json" \
  -d '{
    "device": "Chrome",
    "os": "Windows"
  }'
```

### Get Session
```bash
curl -X GET "http://localhost:8000/api/sessions/sess_test456"
```

### End Session
```bash
curl -X POST "http://localhost:8000/api/sessions/sess_test456/end"
```

---

## 👤 User Management

### Get User Activity Logs
```bash
curl -X GET "http://localhost:8000/api/users/user_test123/activity?limit=100"
```

### Get User Activity by Type
```bash
curl -X GET "http://localhost:8000/api/users/user_test123/activity?limit=100&activity_type=message_sent"
```

### Get User Profile
```bash
curl -X GET "http://localhost:8000/api/users/user_test123/profile"
```

### Get User Statistics
```bash
curl -X GET "http://localhost:8000/api/users/user_test123/stats"
```

---

## 🔄 Multi-Tool Workflow

### Email + Calendar Workflow
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send an email to john@example.com about tomorrows meeting and create a calendar event for 2 PM",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

### Slack + Email Workflow
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send a Slack message to #general and email the team about the deployment",
    "user_id": "user_test123",
    "session_id": "sess_test456"
  }'
```

---

## 🧪 Testing Workflow

### 1. Start Backend
```bash
cd backend
python main.py
```

### 2. Test Health
```bash
curl http://localhost:8000/health
```

### 3. Test Basic Chat
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "user_id": "test", "session_id": "test"}'
```

### 4. Test Tool (Gmail)
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Send email to test@example.com",
    "user_id": "test",
    "session_id": "test"
  }'
```

---

## 📊 Response Examples

### Successful Chat Response
```json
{
  "response": "I'll send that email for you right away!",
  "session_id": "sess_test456",
  "suggested_actions": [],
  "tool_results": [
    {
      "tool": "gmail",
      "action": "send_email",
      "status": "success",
      "message": "Email sent successfully"
    }
  ]
}
```

### Error Response
```json
{
  "detail": "Tool execution failed: Invalid email address"
}
```

### Conversation List Response
```json
{
  "conversations": [
    {
      "conversation_id": "conv_abc123",
      "user_id": "user_test123",
      "title": "Email Discussion",
      "created_at": "2024-12-14T10:00:00",
      "updated_at": "2024-12-14T11:00:00",
      "message_count": 5
    }
  ],
  "total": 1
}
```

---

## 🐛 Debugging Tips

### Check Backend Logs
```bash
# Watch logs in real-time
tail -f backend/logs/app.log
```

### Test MongoDB Connection
```bash
curl http://localhost:8000/health | jq '.services.mongodb'
```

### Test Redis Connection
```bash
curl http://localhost:8000/health | jq '.services.redis'
```

### Verify Tool Registration
```bash
curl http://localhost:8000/health | jq '.tools'
```

---

## 🔧 PowerShell Equivalents

For Windows PowerShell users:

### Basic Chat
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"message": "Hello", "user_id": "test", "session_id": "test"}'
```

### Get Conversations
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/conversations?user_id=user_test123" `
  -Method GET
```

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET
```

---

## 📝 Notes

- Replace `user_test123` and `sess_test456` with actual user/session IDs
- Ensure backend is running on port 8000
- MongoDB and Redis must be running
- OAuth tokens must be configured for Google services
- Slack tokens required for Slack tool
- Twilio credentials needed for SMS tool

---

## 🚀 Quick Test Script

Save this as `test_backend.sh`:

```bash
#!/bin/bash

echo "Testing Backend..."

# Health Check
echo "1. Health Check"
curl -s http://localhost:8000/health | jq

# Basic Chat
echo "2. Basic Chat"
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "user_id": "test", "session_id": "test"}' | jq

# Gmail Tool
echo "3. Gmail Tool"
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Send email to test@example.com", "user_id": "test", "session_id": "test"}' | jq

# Get Conversations
echo "4. Get Conversations"
curl -s "http://localhost:8000/api/conversations?user_id=test" | jq

echo "Tests Complete!"
```

Run with:
```bash
chmod +x test_backend.sh
./test_backend.sh
```

---

**Last Updated:** December 14, 2024  
**Backend Version:** 1.0.0  
**API Base URL:** http://localhost:8000
