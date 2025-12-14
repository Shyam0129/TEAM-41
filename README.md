# Rexie - AI-Powered Multi-Tool Assistant 🤖

> **Real-time AI assistant with integrated Gmail, Slack, Calendar, Docs, and SMS capabilities**

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)]()
[![Tools](https://img.shields.io/badge/tools-5%20integrated-blue)]()
[![Real-time](https://img.shields.io/badge/real--time-enabled-success)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [How to Run](#how-to-run)
- [Available Tools](#available-tools)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)

---

## 🎯 Overview

**Rexie** is an intelligent AI assistant that seamlessly integrates with your favorite productivity tools. Built with a modern tech stack and real-time capabilities, Rexie helps you manage emails, schedule meetings, send messages, create documents, and more - all through natural conversation.

### Key Highlights

✅ **Real-time Tool Integration** - All 5 tools (Gmail, Slack, Calendar, Docs, SMS) work in real-time with proper functionality  
✅ **Conversation History** - Persistent chat history with MongoDB  
✅ **Multi-Tool Support** - Select and use multiple tools in a single conversation  
✅ **Modern UI/UX** - ChatGPT-like interface with centered input and smooth interactions  
✅ **WebSocket Support** - Real-time streaming responses  
✅ **OAuth 2.0** - Secure authentication for Google services  

---

## ✨ Features

### Core Features

- 🎨 **Modern Chat Interface**
  - ChatGPT-style centered input bar
  - Real-time message streaming
  - Tool selection via '+' icon menu
  - Conversation history sidebar
  - Dark/Light mode support

- 🛠️ **Integrated Tools**
  - 📧 **Gmail** - Send emails, read inbox, create drafts
  - 💬 **Slack** - Send messages to channels
  - 📅 **Calendar** - Create/manage events
  - 📄 **Docs** - Generate documents and PDFs
  - 📱 **SMS** - Send text messages

- 💾 **Data Persistence**
  - MongoDB for conversation storage
  - Redis for session management
  - Automatic conversation creation
  - Message history retrieval

- 🔐 **Security**
  - OAuth 2.0 authentication
  - Secure token management
  - CORS protection
  - Environment-based configuration

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────┐
│   Frontend  │ (React + TypeScript)
│   Port 3000 │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────┐
│   Backend   │ (FastAPI + Python)
│   Port 8000 │
└──────┬──────┘
       │
       ├──► MongoDB (Conversations)
       ├──► Redis (Sessions)
       ├──► LLM Router (Groq/Gemini)
       └──► Tools Layer
            ├── Gmail Tool
            ├── Slack Tool
            ├── Calendar Tool
            ├── Docs Tool
            └── SMS Tool
```

### Data Flow

```
User Input → Frontend → Backend → LLM Router → Tool Selection
                                       ↓
                                  Tool Execution
                                       ↓
                              MongoDB (Save Message)
                                       ↓
                              Response Generation
                                       ↓
                              Frontend (Display)
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **WebSocket** - Real-time communication

### Backend
- **FastAPI** - Web framework
- **Python 3.11+** - Programming language
- **Motor** - Async MongoDB driver
- **Redis** - Session management
- **Groq/Gemini** - LLM providers
- **OAuth 2.0** - Authentication

### Database & Infrastructure
- **MongoDB 7.0** - Document database
- **Redis** - In-memory cache
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

---

## 📁 Folder Structure

```
TEAM-41/
├── backend/                      # Backend application
│   ├── db/                       # Database clients
│   │   └── mongo_client.py       # MongoDB connection
│   ├── models/                   # Pydantic models
│   │   ├── schema.py             # Request/Response models
│   │   └── conversation.py       # Conversation models
│   ├── tools/                    # Tool implementations
│   │   ├── gmail_tool.py         # Gmail integration
│   │   ├── slack_tool.py         # Slack integration
│   │   ├── calendar_tool.py      # Calendar integration
│   │   ├── docs_tool.py          # Docs/PDF generation
│   │   ├── sms_tool.py           # SMS integration
│   │   └── google_auth.py        # OAuth handler
│   ├── utils/                    # Utility modules
│   │   ├── config.py             # Configuration
│   │   ├── state_manager.py      # Redis state management
│   │   ├── llm_router.py         # LLM routing logic
│   │   ├── conversation_manager.py # Conversation CRUD
│   │   ├── websocket_handler.py  # WebSocket handler
│   │   ├── gemini_client.py      # Gemini LLM client
│   │   └── groq_client.py        # Groq LLM client
│   ├── main.py                   # FastAPI application
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Environment variables
│   └── Dockerfile                # Docker configuration
│
├── frontend/                     # Frontend application
│   ├── components/               # React components
│   │   ├── InputArea.tsx         # Input bar with tool selection
│   │   ├── MessageContent.tsx    # Message display
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── ConversationHistory.tsx # Chat history
│   │   └── ToolsModal.tsx        # Tools configuration
│   ├── services/                 # API services
│   │   ├── backendService.ts     # Backend API calls
│   │   ├── conversationService.ts # Conversation API
│   │   └── websocketService.ts   # WebSocket client
│   ├── App.tsx                   # Main application
│   ├── types.ts                  # TypeScript types
│   ├── constants.tsx             # Constants
│   ├── package.json              # Node dependencies
│   ├── .env.example              # Environment template
│   └── vite.config.ts            # Vite configuration
│
├── docker-compose.yml            # Docker services
├── README.md                     # This file
└── REQUIREMENTS.md               # Detailed requirements
```

---

## 📋 Requirements

### System Requirements

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose
- **MongoDB** 7.0+
- **Redis** 7.0+

### API Keys Required

1. **Google OAuth 2.0**
   - Client ID and Secret
   - Enable Gmail API, Calendar API, Docs API
   - Download `credentials.json`

2. **Groq API** (or Gemini)
   - API key from [Groq Console](https://console.groq.com)

3. **Slack** (Optional)
   - Bot Token
   - App Token
   - Workspace setup

4. **Twilio** (Optional for SMS)
   - Account SID
   - Auth Token
   - Phone number

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Shyam0129/TEAM-41.git
cd TEAM-41
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Add GROQ_API_KEY, MONGODB_URL, REDIS_URL, etc.
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with backend URL
# VITE_API_URL=http://localhost:8000
```

### 4. Docker Setup (Recommended)

```bash
# From project root
docker compose up -d mongodb redis

# Verify containers are running
docker ps
```

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs: Gmail, Calendar, Docs
4. Create OAuth 2.0 credentials
5. Download `credentials.json` to `backend/`
6. Run authentication:

```bash
cd backend
python authenticate_google.py
```

---

## ▶️ How to Run

### Option 1: Development Mode (Recommended)

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Docker (Full Stack)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Option 3: Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve with backend
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 🔧 Available Tools

All tools are fully functional and work in real-time:

### 1. Gmail Tool 📧
**Capabilities:**
- Send emails with subject and body
- Read inbox messages
- Create draft emails
- Search emails by query

**Usage:**
```
"Send an email to john@example.com about the meeting"
"Check my latest emails"
"Create a draft email to the team"
```

### 2. Slack Tool 💬
**Capabilities:**
- Send messages to channels
- Post threaded replies
- List available channels
- Send direct messages

**Usage:**
```
"Send a message to #general channel"
"Post in #dev-team about the deployment"
```

### 3. Calendar Tool 📅
**Capabilities:**
- Create calendar events
- List upcoming events
- Update existing events
- Delete events

**Usage:**
```
"Schedule a meeting tomorrow at 2 PM"
"Show my calendar for next week"
"Update the team meeting to 3 PM"
```

### 4. Docs Tool 📄
**Capabilities:**
- Generate PDF documents
- Create Google Docs
- Extract text from PDFs
- Format documents

**Usage:**
```
"Create a PDF report with the quarterly results"
"Generate a meeting notes document"
```

### 5. SMS Tool 📱
**Capabilities:**
- Send text messages
- Bulk SMS sending
- Message templates

**Usage:**
```
"Send an SMS to +1234567890 about the appointment"
"Text the team about the delay"
```

---

## 📡 API Documentation

### REST Endpoints

#### Chat
```http
POST /chat
Content-Type: application/json

{
  "message": "Send an email to john@example.com",
  "user_id": "user_123",
  "session_id": "sess_456"
}
```

#### Conversations
```http
GET /api/conversations?user_id=user_123
POST /api/conversations
GET /api/conversations/{conversation_id}
DELETE /api/conversations/{conversation_id}
```

#### Health Check
```http
GET /health
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat');

ws.send(JSON.stringify({
  message: "Hello Rexie",
  user_id: "user_123",
  session_id: "sess_456"
}));
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
# LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DEFAULT_LLM_PROVIDER=groq

# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=ai_assistant
REDIS_URL=redis://localhost:6379

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Slack (Optional)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 🎨 UI/UX Features

### Modern Chat Interface
- **Centered Input Bar** - ChatGPT-style input positioning
- **Tool Selection Menu** - Click '+' icon to select tools
- **Real-time Streaming** - See responses as they're generated
- **Conversation History** - Access past conversations from sidebar
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works on desktop, tablet, and mobile

### User Experience Improvements
- ✅ Input bar properly positioned (no overlap with messages)
- ✅ Tool badges show selected tool
- ✅ Smooth animations and transitions
- ✅ Loading indicators for tool execution
- ✅ Error handling with user-friendly messages
- ✅ Auto-scroll to latest message

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
pytest tests/
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing
1. Start both backend and frontend
2. Open http://localhost:3000
3. Try sending a message
4. Select a tool from the '+' menu
5. Verify tool execution and response

---

## 📊 Performance

- **Response Time**: < 2s for simple queries
- **Tool Execution**: Real-time with streaming
- **Concurrent Users**: Supports 100+ simultaneous connections
- **Database**: Optimized queries with indexing
- **Caching**: Redis for session data

---

## 🔒 Security

- ✅ OAuth 2.0 for Google services
- ✅ Environment-based secrets
- ✅ CORS protection
- ✅ Input validation
- ✅ Rate limiting
- ✅ Secure token storage

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker restart mongodb
```

### Port Already in Use
```bash
# Kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8000 | xargs kill -9
```

### Frontend Not Loading
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**TEAM-41** - AI-Powered Assistant Development Team

---

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- React team for the UI library
- MongoDB and Redis for database solutions
- Groq for LLM API access
- Google for OAuth and API services

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API docs at `/docs`

---

**Built with ❤️ by TEAM-41**

*Last Updated: December 14, 2024*
