"""FastAPI application for AI Assistant backend."""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import uuid
from datetime import datetime

from models.schema import (
    UserRequest,
    AgentResponse,
    HealthResponse,
    ConversationState,
    ConversationStatus
)
from db.mongo_client import MongoDBClient, mongodb_client
from utils.config import get_settings
from utils.state_manager import StateManager, state_manager
from utils.gemini_client import GeminiClient
from utils.llm_router import LLMRouter
from tools.google_auth import GoogleAuthHandler
from tools.gmail_tool import GmailTool
from tools.calendar_tool import CalendarTool
from tools.docs_tool import DocsTool
from tools.slack_tool import SlackTool
from tools.sms_tool import SMSTool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting up application...")
    
    # Initialize MongoDB
    global mongodb_client
    mongodb_client = MongoDBClient(
        connection_string=settings.mongodb_url,
        database_name=settings.mongodb_database
    )
    await mongodb_client.connect()
    
    # Initialize Redis State Manager
    global state_manager
    state_manager = StateManager(
        redis_url=settings.redis_url,
        default_ttl=settings.redis_ttl
    )
    await state_manager.connect()
    
    logger.info("Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await mongodb_client.disconnect()
    await state_manager.disconnect()
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Assistant Backend API",
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    mongodb_healthy = await mongodb_client.health_check()
    redis_healthy = await state_manager.health_check()
    
    status = "healthy" if (mongodb_healthy and redis_healthy) else "unhealthy"
    
    return HealthResponse(
        status=status,
        mongodb=mongodb_healthy,
        redis=redis_healthy,
        timestamp=datetime.utcnow()
    )


@app.post("/chat", response_model=AgentResponse)
async def chat(request: UserRequest):
    """
    Main chat endpoint for user interactions.
    
    Args:
        request: User request with message and metadata
        
    Returns:
        Agent response with action details
    """
    try:
        # Generate or use existing session ID
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get or create conversation state
        state = await state_manager.get_state(session_id)
        
        if not state:
            state = ConversationState(
                session_id=session_id,
                user_id=request.user_id,
                status=ConversationStatus.PENDING
            )
        
        # Add user message to history
        state.conversation_history.append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Initialize Gemini client
        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=500,
                detail="Gemini API key not configured"
            )
        
        gemini_client = GeminiClient(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model
        )
        
        # Initialize LLM router
        llm_router = LLMRouter(gemini_client)
        
        # Analyze user request
        analysis = llm_router.analyze_request(request.message)
        
        # Create tool action if applicable
        tool_action = llm_router.create_tool_action(
            analysis["intent"],
            analysis["parameters"]
        )
        
        if tool_action and tool_action.requires_confirmation:
            # Store pending action and await confirmation
            state.pending_action = tool_action
            state.status = ConversationStatus.AWAITING_CONFIRMATION
            
            confirmation_msg = llm_router.generate_confirmation_message(tool_action)
            
            # Save state
            await state_manager.save_state(state)
            
            return AgentResponse(
                response=confirmation_msg,
                session_id=session_id,
                action_required=True,
                suggested_actions=["yes", "no", "modify"]
            )
        
        elif tool_action and not tool_action.requires_confirmation:
            # Execute action directly
            result = await execute_tool_action(tool_action)
            
            state.status = ConversationStatus.COMPLETED
            state.conversation_history.append({
                "role": "assistant",
                "content": f"Action completed: {result}",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            await state_manager.save_state(state)
            
            return AgentResponse(
                response=f"I've completed the action: {result}",
                session_id=session_id,
                action_required=False
            )
        
        else:
            # General query - generate response
            response_text = gemini_client.generate_response(request.message)
            
            state.conversation_history.append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            await state_manager.save_state(state)
            
            return AgentResponse(
                response=response_text,
                session_id=session_id,
                action_required=False
            )
    
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/confirm/{session_id}")
async def confirm_action(session_id: str, confirmed: bool):
    """
    Confirm or reject a pending action.
    
    Args:
        session_id: Session identifier
        confirmed: Whether the action is confirmed
        
    Returns:
        Result of the action
    """
    try:
        # Get conversation state
        state = await state_manager.get_state(session_id)
        
        if not state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if state.status != ConversationStatus.AWAITING_CONFIRMATION:
            raise HTTPException(status_code=400, detail="No pending action to confirm")
        
        if not confirmed:
            state.status = ConversationStatus.PENDING
            state.pending_action = None
            await state_manager.save_state(state)
            
            return {"message": "Action cancelled"}
        
        # Execute the pending action
        result = await execute_tool_action(state.pending_action)
        
        state.status = ConversationStatus.COMPLETED
        state.pending_action = None
        state.conversation_history.append({
            "role": "system",
            "content": f"Action executed: {result}",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        await state_manager.save_state(state)
        
        return {
            "message": "Action completed successfully",
            "result": result
        }
    
    except Exception as e:
        logger.error(f"Error confirming action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def execute_tool_action(tool_action):
    """
    Execute a tool action.
    
    Args:
        tool_action: ToolAction to execute
        
    Returns:
        Execution result
    """
    # This is a placeholder - implement actual tool execution
    # based on tool_type and action
    
    logger.info(f"Executing tool action: {tool_action.tool_type} - {tool_action.action}")
    
    # Example implementation would initialize the appropriate tool
    # and call the corresponding method with parameters
    
    return f"Executed {tool_action.action} with {tool_action.tool_type}"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
