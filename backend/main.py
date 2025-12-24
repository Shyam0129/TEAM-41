"""FastAPI application for AI Assistant backend."""
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from models.schema import (
    UserRequest,
    AgentResponse,
    HealthResponse,
    ConversationState,
    ConversationStatus,
    ToolType,
    ToolAction
)
from db.mongo_client import MongoDBClient, mongodb_client
from utils.config import get_settings
from utils.state_manager import StateManager, state_manager
from utils.conversation_manager import ConversationManager
from utils.websocket_handler import ConnectionManager, WebSocketChatHandler
from utils.gemini_client import GeminiClient
from utils.llm_router import LLMRouter
from tools.google_auth import GoogleAuthHandler
from tools.gmail_tool import GmailTool
from tools.calendar_tool import CalendarTool
from tools.docs_tool import DocsTool
from tools.slack_tool import SlackTool
from tools.sms_tool import SMSTool

# Production OAuth imports
from starlette.middleware.sessions import SessionMiddleware
from auth import init_jwt_handler
from routes.auth_routes import router as auth_router

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
    
    # Initialize Conversation Manager
    global conversation_manager
    conversation_manager = ConversationManager(mongodb_client)
    
    # Initialize WebSocket Connection Manager
    global connection_manager
    connection_manager = ConnectionManager()
    
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

# Add session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key
)

# Initialize JWT handler
init_jwt_handler(
    secret_key=settings.jwt_secret_key,
    algorithm=settings.jwt_algorithm,
    access_token_expire_minutes=settings.jwt_access_token_expire_minutes,
    refresh_token_expire_days=settings.jwt_refresh_token_expire_days
)

# Register authentication routes
app.include_router(auth_router)


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


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download generated PDF/Doc files."""
    from fastapi.responses import FileResponse
    from tools.pdf_tool import PDFDocTool
    import os
    
    try:
        pdf_tool = PDFDocTool()
        filepath = pdf_tool.get_file(filename)
        
        # Determine content type
        if filename.endswith('.pdf'):
            media_type = 'application/pdf'
        elif filename.endswith('.docx'):
            media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            media_type = 'application/octet-stream'
        
        return FileResponse(
            path=filepath,
            media_type=media_type,
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except FileNotFoundError:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Error downloading file")


@app.post("/chat", response_model=AgentResponse)
async def chat(request: UserRequest):
    try:
        session_id = request.session_id or str(uuid.uuid4())

        state = await state_manager.get_state(session_id)

        if not state:
            state = ConversationState(
                session_id=session_id,
                user_id=request.user_id,
                status=ConversationStatus.PENDING
            )

        # 🔥 CONFIRMATION HANDLER
        if state.status == ConversationStatus.AWAITING_CONFIRMATION:
            user_reply = request.message.strip().lower()

            # Handle email-specific commands
            if state.pending_action and state.pending_action.tool_type == ToolType.GMAIL:
                if user_reply in ["send", "s"]:
                    # Send email immediately
                    result = await execute_tool_action(state.pending_action)
                    
                    state.status = ConversationStatus.COMPLETED
                    state.pending_action = None
                    await state_manager.save_state(state)
                    
                    return AgentResponse(
                        response=f"✅ Email sent successfully!\n\n{result}",
                        session_id=session_id,
                        action_required=False
                    )
                
                elif user_reply in ["draft", "d"]:
                    # Save as draft
                    auth_handler = GoogleAuthHandler(
                        credentials_file=settings.google_credentials_file,
                        token_file=settings.google_token_file
                    )
                    gmail_tool = GmailTool(auth_handler)
                    
                    params = state.pending_action.parameters
                    draft = gmail_tool.create_draft(
                        to=params.get("to"),
                        subject=params.get("subject"),
                        body=params.get("body"),
                        cc=params.get("cc"),
                        bcc=params.get("bcc")
                    )
                    
                    state.status = ConversationStatus.COMPLETED
                    state.pending_action = None
                    await state_manager.save_state(state)
                    
                    return AgentResponse(
                        response=f"✅ Email saved as draft in Gmail!\n\nDraft ID: {draft['id']}\n\nYou can find it in your Gmail drafts folder.",
                        session_id=session_id,
                        action_required=False
                    )
                
                elif user_reply in ["modify", "m", "edit"]:
                    state.status = ConversationStatus.PENDING
                    state.pending_action = None
                    await state_manager.save_state(state)
                    
                    return AgentResponse(
                        response="Sure! Please tell me what you'd like to change in the email.",
                        session_id=session_id,
                        action_required=False
                    )

            # Handle standard yes/no confirmations for other actions
            if user_reply in ["yes", "y", "confirm"]:
                return await confirm_action(session_id, confirmed=True)

            if user_reply in ["no", "n", "cancel"]:
                return await confirm_action(session_id, confirmed=False)

            if user_reply == "modify":
                state.status = ConversationStatus.PENDING
                state.pending_action = None
                await state_manager.save_state(state)

                return AgentResponse(
                    response="Sure. What would you like to change?",
                    session_id=session_id,
                    action_required=False
                )

        # Add user message to history
        state.conversation_history.append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat()
        })

        # -------- EXISTING LOGIC CONTINUES (UNCHANGED) --------
        llm_client = None

        if settings.llm_provider == "groq":
            from utils.groq_client import GroqClient
            llm_client = GroqClient(
                api_key=settings.groq_api_key,
                model_name=settings.groq_model
            )
        else:
            llm_client = GeminiClient(
                api_key=settings.gemini_api_key,
                model_name=settings.gemini_model
            )

        llm_router = LLMRouter(llm_client)
        
        # Multi-tool handling
        from utils.multi_tool_handler import MultiToolHandler
        multi_handler = MultiToolHandler(llm_client)
        multi_analysis = multi_handler.analyze_request(request.message)
        
        if multi_analysis.get("is_multi_tool"):
            tasks = multi_analysis["tasks"]
            results = []
            
            logger.info(f"Multi-tool request detected: {len(tasks)} tasks")
            
            for task in sorted(tasks, key=lambda x: x["order"]):
                intent = multi_handler.map_tool_to_intent(task["tool"])
                tool_action = llm_router.create_tool_action(intent, task["parameters"])
                
                if tool_action:
                    result = await execute_tool_action(tool_action)
                    results.append(f"✅ {task['description']}\n{result}")
                    logger.info(f"Completed task: {task['description']}")
            
            combined = f"""🎯 **Multi-Task Execution Complete!**

{multi_analysis.get('summary', 'Multiple tasks completed successfully.')}

**Results:**

""" + "\n\n---\n\n".join(results)
            
            state.status = ConversationStatus.COMPLETED
            state.conversation_history.append({
                "role": "assistant",
                "content": combined,
                "timestamp": datetime.utcnow().isoformat()
            })
            await state_manager.save_state(state)
            
            return AgentResponse(response=combined, session_id=session_id, action_required=False)
        
        # Single tool handling
        analysis = llm_router.analyze_request(request.message)

        tool_action = llm_router.create_tool_action(
            analysis["intent"],
            analysis["parameters"]
        )

        if tool_action and tool_action.requires_confirmation:
            # Special handling for send_email - generate brief email first
            if tool_action.tool_type == ToolType.GMAIL and tool_action.action == "send_email":
                # Generate brief, professional email
                recipient = tool_action.parameters.get("to", "")
                purpose = tool_action.parameters.get("body", request.message)
                
                # Use LLM to generate professional email
                email_content = llm_client.generate_email(
                    recipient=recipient,
                    purpose=purpose,
                    context=request.message
                )
                
                # Update parameters with generated content
                tool_action.parameters["subject"] = email_content["subject"]
                tool_action.parameters["body"] = email_content["body"]
                
                # Store action with generated email
                state.pending_action = tool_action
                state.status = ConversationStatus.AWAITING_CONFIRMATION
                await state_manager.save_state(state)
                
                # Show draft preview with options
                preview_message = f"""📧 **Email Draft Preview**

**To:** {recipient}
**Subject:** {email_content['subject']}

**Body:**
{email_content['body']}

---

Would you like to:
• Type "send" to send this email now
• Type "draft" to save as draft in Gmail
• Type "modify" to make changes"""
                
                return AgentResponse(
                    response=preview_message,
                    session_id=session_id,
                    action_required=True,
                    suggested_actions=["send", "draft", "modify"],
                    metadata={
                        "email_preview": {
                            "to": recipient,
                            "subject": email_content["subject"],
                            "body": email_content["body"]
                        }
                    }
                )
            
            # For other actions, use standard confirmation
            else:
                state.pending_action = tool_action
                state.status = ConversationStatus.AWAITING_CONFIRMATION
                await state_manager.save_state(state)
                
                confirmation_msg = llm_router.generate_confirmation_message(tool_action)
                
                return AgentResponse(
                    response=confirmation_msg,
                    session_id=session_id,
                    action_required=True,
                    suggested_actions=["yes", "no"]
                )

        elif tool_action:
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
                session_id=session_id
            )

        else:
            response_text = llm_client.generate_response(request.message)

            state.conversation_history.append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow().isoformat()
            })

            await state_manager.save_state(state)

            return AgentResponse(
                response=response_text,
                session_id=session_id
            )

    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail=str(e))
async def confirm_pending_action(session_id: str, confirmed: bool) -> dict:
    state = await state_manager.get_state(session_id)

    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if state.status != ConversationStatus.AWAITING_CONFIRMATION:
        raise HTTPException(status_code=400, detail="No pending action to confirm")

    if not confirmed:
        state.status = ConversationStatus.PENDING
        state.pending_action = None
        await state_manager.save_state(state)
        return AgentResponse(
            response="Action cancelled",
            session_id=session_id,
            action_required=False
        )

    result = await execute_tool_action(state.pending_action)

    state.status = ConversationStatus.COMPLETED
    state.pending_action = None
    state.conversation_history.append({
        "role": "system",
        "content": f"Action executed: {result}",
        "timestamp": datetime.utcnow().isoformat()
    })

    await state_manager.save_state(state)

    return AgentResponse(
        response=result,
        session_id=session_id,
        action_required=False
    )


@app.post("/confirm/{session_id}")
async def confirm_action(session_id: str, confirmed: bool):
    return await confirm_pending_action(session_id, confirmed)
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
    logger.info(f"Executing tool action: {tool_action.tool_type} - {tool_action.action}")
    
    try:
        # Initialize Google Auth Handler
        auth_handler = GoogleAuthHandler(
            credentials_file=settings.google_credentials_file,
            token_file=settings.google_token_file
        )
        
        # Execute based on tool type
        if tool_action.tool_type == ToolType.GMAIL:
            gmail_tool = GmailTool(auth_handler)
            return await execute_gmail_action(gmail_tool, tool_action)
        
        elif tool_action.tool_type == ToolType.CALENDAR:
            calendar_tool = CalendarTool(auth_handler)
            return await execute_calendar_action(calendar_tool, tool_action)
        
        elif tool_action.tool_type == ToolType.DOCS:
            docs_tool = DocsTool(auth_handler)
            return await execute_docs_action(docs_tool, tool_action)
        
        elif tool_action.tool_type == ToolType.SLACK:
            slack_tool = SlackTool(settings.slack_bot_token)
            return await execute_slack_action(slack_tool, tool_action)
        
        elif tool_action.tool_type == ToolType.SMS:
            sms_tool = SMSTool(
                account_sid=settings.twilio_account_sid,
                auth_token=settings.twilio_auth_token,
                from_number=settings.twilio_phone_number
            )
            return await execute_sms_action(sms_tool, tool_action)
        
        else:
            raise ValueError(f"Unknown tool type: {tool_action.tool_type}")
    
    except Exception as e:
        logger.error(f"Failed to execute tool action: {e}")
        raise


async def execute_gmail_action(gmail_tool: GmailTool, tool_action: ToolAction) -> str:
    """Execute Gmail-specific actions."""
    action = tool_action.action
    params = tool_action.parameters
    
    if action == "send_email":
        result = gmail_tool.send_email(
            to=params.get("to"),
            subject=params.get("subject"),
            body=params.get("body"),
            cc=params.get("cc"),
            bcc=params.get("bcc"),
            attachments=params.get("attachments")
        )
        return f"Email sent successfully to {params.get('to')}. Message ID: {result['id']}"
    
    elif action == "list_messages":
        max_results = params.get("max_results", 10)
        query = params.get("query")
        messages = gmail_tool.list_messages(max_results=max_results, query=query)
        
        if not messages:
            return "No messages found."
        
        # Get full details for each message
        detailed_messages = []
        for msg in messages[:5]:  # Limit to 5 for brevity
            full_msg = gmail_tool.get_message(msg['id'])
            parsed = gmail_tool.parse_message(full_msg)
            detailed_messages.append(f"From: {parsed.get('from', 'Unknown')}\nSubject: {parsed.get('subject', 'No subject')}\nSnippet: {parsed.get('snippet', '')}")
        
        return f"Found {len(messages)} messages. Here are the most recent:\n\n" + "\n---\n".join(detailed_messages)
    
    elif action == "search_messages":
        query = params.get("query", "")
        max_results = params.get("max_results", 10)
        messages = gmail_tool.search_messages(query=query, max_results=max_results)
        
        if not messages:
            return f"No messages found matching '{query}'."
        
        summaries = [f"From: {m.get('from', 'Unknown')}\nSubject: {m.get('subject', 'No subject')}" for m in messages[:5]]
        return f"Found {len(messages)} messages matching '{query}':\n\n" + "\n---\n".join(summaries)
    
    elif action == "get_unread_messages":
        max_results = params.get("max_results", 10)
        messages = gmail_tool.get_unread_messages(max_results=max_results)
        
        if not messages:
            return "No unread messages."
        
        summaries = [f"From: {m.get('from', 'Unknown')}\nSubject: {m.get('subject', 'No subject')}" for m in messages[:5]]
        return f"You have {len(messages)} unread messages:\n\n" + "\n---\n".join(summaries)
    
    else:
        raise ValueError(f"Unknown Gmail action: {action}")


async def execute_calendar_action(calendar_tool: CalendarTool, tool_action: ToolAction) -> str:
    """Execute Calendar-specific actions."""
    action = tool_action.action
    params = tool_action.parameters
    
    if action == "create_event":
        from datetime import datetime, timedelta
        from utils.datetime_parser import parse_natural_datetime
        
        # Parse datetime strings if needed
        start_time = params.get("start_time")
        end_time = params.get("end_time")
        
        if isinstance(start_time, str):
            # Check if it's already in ISO format
            if 'T' in start_time and start_time.count('-') >= 2:
                # ISO format
                try:
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    if isinstance(end_time, str) and 'T' in end_time:
                        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    else:
                        end_time = start_time + timedelta(hours=1)
                except ValueError:
                    # Parse as natural language
                    parsed = parse_natural_datetime(f"{start_time} {end_time if end_time else ''}")
                    start_time = parsed["start_time"]
                    end_time = parsed["end_time"]
            else:
                # Natural language - parse it
                parsed = parse_natural_datetime(f"{start_time} {end_time if end_time else ''}")
                start_time = parsed["start_time"]
                end_time = parsed["end_time"]
        
        if isinstance(end_time, str) and isinstance(start_time, datetime):
            # end_time still needs parsing - use start_time + 1 hour
            end_time = start_time + timedelta(hours=1)
        
        result = calendar_tool.create_event(
            summary=params.get("summary"),
            start_time=start_time,
            end_time=end_time,
            description=params.get("description"),
            location=params.get("location"),
            attendees=params.get("attendees")
        )
        
        # Format times for display
        start_formatted = start_time.strftime("%B %d, %Y at %I:%M %p")
        end_formatted = end_time.strftime("%I:%M %p")
        event_link = result.get('htmlLink', '')
        
        completion_msg = f"""✅ **Calendar Event Created Successfully!**

📅 **Event:** {params.get('summary')}
🕐 **When:** {start_formatted} - {end_formatted}"""
        
        if params.get('location'):
            completion_msg += f"\n📍 **Location:** {params.get('location')}"
        if params.get('description'):
            completion_msg += f"\n📝 **Description:** {params.get('description')}"
        
        completion_msg += f"\n\n🔗 **View in Google Calendar:** {event_link}"
        completion_msg += f"\n\n✨ The event has been added to your Google Calendar!"
        
        return completion_msg
    
    elif action == "search_events":
        from datetime import datetime
        
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        query = params.get("query")
        max_results = params.get("max_results", 10)
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        events = calendar_tool.search_events(
            start_date=start_date,
            end_date=end_date,
            query=query,
            max_results=max_results
        )
        
        if not events:
            return "No events found."
        
        summaries = [f"{e.get('summary', 'No title')} - {e.get('start', {}).get('dateTime', 'No time')}" for e in events]
        return f"Found {len(events)} events:\n" + "\n".join(summaries)
    
    elif action == "get_events_today":
        from datetime import datetime
        events = calendar_tool.get_events_today()
        
        if not events:
            return "📅 No events scheduled for today. You're all clear!"
        
        response = f"📅 **Today's Schedule** ({len(events)} event{'s' if len(events) > 1 else ''}):\n\n"
        
        for i, e in enumerate(events, 1):
            start_time = e.get('start', {}).get('dateTime', '')
            if start_time:
                dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                time_str = dt.strftime("%I:%M %p")
            else:
                time_str = "All day"
            
            response += f"{i}. **{e.get('summary', 'No title')}**\n"
            response += f"   🕐 {time_str}\n"
            if e.get('location'):
                response += f"   📍 {e.get('location')}\n"
            response += "\n"
        
        return response.strip()
    
    elif action == "get_events_this_week":
        events = calendar_tool.get_events_this_week()
        
        if not events:
            return "No events scheduled for this week."
        
        summaries = [f"{e.get('summary', 'No title')} - {e.get('start', {}).get('dateTime', 'No time')}" for e in events]
        return f"This week's events ({len(events)}):\n" + "\n".join(summaries)
    
    elif action == "update_event":
        from datetime import datetime
        
        event_id = params.get("event_id")
        start_time = params.get("start_time")
        end_time = params.get("end_time")
        
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        result = calendar_tool.update_event(
            event_id=event_id,
            summary=params.get("summary"),
            start_time=start_time,
            end_time=end_time,
            description=params.get("description"),
            location=params.get("location")
        )
        return f"Calendar event updated successfully. Event ID: {event_id}"
    
    elif action == "delete_event":
        event_id = params.get("event_id")
        calendar_tool.delete_event(event_id)
        return f"Calendar event deleted successfully. Event ID: {event_id}"
    
    else:
        raise ValueError(f"Unknown Calendar action: {action}")


async def execute_docs_action(docs_tool: DocsTool, tool_action: ToolAction) -> str:
    """Execute Docs-specific actions - PDF/Doc generation."""
    action = tool_action.action
    params = tool_action.parameters
    
    if action == "create_document":
        from tools.pdf_tool import PDFDocTool
        from utils.config import get_settings
        from datetime import datetime
        import logging
        
        logger = logging.getLogger(__name__)
        settings = get_settings()
        
        # Get LLM client for content generation
        if settings.llm_provider == "groq":
            from utils.groq_client import GroqClient
            llm_client = GroqClient(
                api_key=settings.groq_api_key,
                model_name=settings.groq_model
            )
        else:
            from utils.gemini_client import GeminiClient
            llm_client = GeminiClient(
                api_key=settings.gemini_api_key,
                model_name=settings.gemini_model
            )
        
        # Get parameters
        topic = params.get("topic", params.get("title", "Document"))
        title = params.get("title")
        doc_format = params.get("format", "pdf").lower()
        document_type = params.get("document_type", "general")
        
        # Generate content using LLM
        logger.info(f"Generating document content for topic: {topic}")
        doc_data = llm_client.generate_document_content(
            topic=topic,
            document_type=document_type,
            length="detailed"
        )
        
        # Use generated title if not provided
        if not title:
            title = doc_data["title"]
        
        content = doc_data["content"]
        
        # Initialize PDF/Doc tool
        pdf_tool = PDFDocTool()
        
        # Generate document based on format
        if doc_format == "docx" or doc_format == "doc":
            result = pdf_tool.generate_docx(
                title=title,
                content=content,
                author="AI Assistant"
            )
            format_name = "Word Document"
        else:
            result = pdf_tool.generate_pdf(
                title=title,
                content=content,
                author="AI Assistant"
            )
            format_name = "PDF"
        
        # Create download URL
        download_url = f"http://{settings.host}:{settings.port}/download/{result['filename']}"
        
        # Format file size
        size_mb = result['size_bytes'] / (1024 * 1024)
        size_str = f"{size_mb:.2f} MB" if size_mb >= 1 else f"{result['size_bytes'] / 1024:.2f} KB"
        
        completion_msg = f"""✅ **{format_name} Created Successfully!**

📄 **Title:** {title}
📊 **Format:** {format_name}
📏 **Size:** {size_str}
📅 **Created:** {datetime.now().strftime('%B %d, %Y at %I:%M %p')}

🔗 **Download Your File:**

Click here to download: [{result['filename']}]({download_url})

Or copy this link: {download_url}

✨ Your document is ready with:
• Comprehensive coverage of the topic
• Well-structured sections
• Professional formatting
• Detailed information and examples

💡 Tip: Right-click the link and select "Save As" to download directly."""
        
        return completion_msg
    
    else:
        raise ValueError(f"Unknown Docs action: {action}")


async def execute_slack_action(slack_tool: SlackTool, tool_action: ToolAction) -> str:
    """Execute Slack-specific actions."""
    action = tool_action.action
    params = tool_action.parameters
    
    if action == "send_message":
        channel = params.get("channel", "general")
        message = params.get("message", "")
        
        result = slack_tool.send_message(
            channel=channel,
            text=message
        )
        
        return f"""✅ **Slack Message Sent!**

📢 **Channel:** #{channel}
💬 **Message:** {message}

✨ Your message has been posted to Slack!"""
    
    else:
        raise ValueError(f"Unknown Slack action: {action}")


async def execute_sms_action(sms_tool: SMSTool, tool_action: ToolAction) -> str:
    """Execute SMS-specific actions."""
    action = tool_action.action
    params = tool_action.parameters
    
    if action == "send_sms":
        result = sms_tool.send_sms(
            to_number=params.get("to_number"),
            message=params.get("message")
        )
        return f"SMS sent successfully to {params.get('to_number')}"
    
    else:
        raise ValueError(f"Unknown SMS action: {action}")


# ============================================================================
# WebSocket Endpoint for Real-Time Chat
# ============================================================================

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    user_id: str = Query(..., description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID")
):
    """WebSocket endpoint for real-time chat."""
    ws_handler = WebSocketChatHandler(
        conversation_manager=conversation_manager,
        state_manager=state_manager,
        connection_manager=connection_manager
    )
    
    await ws_handler.handle_connection(websocket, user_id, session_id)


# ============================================================================
# Conversation Management Endpoints
# ============================================================================

@app.get("/api/conversations")
async def get_user_conversations(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, description="Number of conversations to retrieve"),
    skip: int = Query(0, description="Number of conversations to skip"),
    include_archived: bool = Query(False, description="Include archived conversations")
):
    """Get all conversations for a user."""
    try:
        conversations = await conversation_manager.get_user_conversations(
            user_id=user_id,
            limit=limit,
            skip=skip,
            include_archived=include_archived
        )
        
        return {
            "conversations": [c.model_dump() for c in conversations],
            "total": len(conversations)
        }
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation by ID."""
    try:
        conversation = await conversation_manager.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return conversation.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    limit: Optional[int] = Query(None, description="Number of messages to retrieve")
):
    """Get messages for a specific conversation."""
    try:
        messages = await conversation_manager.get_conversation_history(
            conversation_id=conversation_id,
            limit=limit
        )
        
        return {
            "conversation_id": conversation_id,
            "messages": [m.model_dump() for m in messages],
            "total": len(messages)
        }
    except Exception as e:
        logger.error(f"Error getting conversation messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conversations")
async def create_conversation(
    user_id: str = Query(..., description="User ID"),
    session_id: str = Query(..., description="Session ID"),
    first_message: Optional[str] = Query(None, description="First message to initialize conversation")
):
    """Create a new conversation."""
    try:
        conversation = await conversation_manager.create_conversation(
            user_id=user_id,
            session_id=session_id,
            first_message=first_message
        )
        
        return conversation.model_dump()
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    title: Optional[str] = Query(None, description="New conversation title")
):
    """Update a conversation."""
    try:
        if title:
            success = await conversation_manager.update_conversation_title(
                conversation_id=conversation_id,
                title=title
            )
            
            if not success:
                raise HTTPException(status_code=404, detail="Conversation not found")
            
            return {"message": "Conversation updated successfully"}
        
        return {"message": "No updates provided"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    try:
        success = await conversation_manager.delete_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conversations/{conversation_id}/archive")
async def archive_conversation(conversation_id: str):
    """Archive a conversation."""
    try:
        success = await conversation_manager.archive_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"message": "Conversation archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Session Management Endpoints
# ============================================================================

@app.post("/api/sessions")
async def create_session(
    user_id: str = Query(..., description="User ID"),
    device_info: Optional[dict] = None
):
    """Create a new user session."""
    try:
        session = await conversation_manager.create_session(
            user_id=user_id,
            device_info=device_info
        )
        
        return session.model_dump()
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session by ID."""
    try:
        session = await conversation_manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End a user session."""
    try:
        success = await conversation_manager.end_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session ended successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# User Activity Logs Endpoints
# ============================================================================

@app.get("/api/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    limit: int = Query(100, description="Number of activity logs to retrieve"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type")
):
    """Get user activity logs."""
    try:
        logs = await conversation_manager.get_user_activity_logs(
            user_id=user_id,
            limit=limit,
            activity_type=activity_type
        )
        
        return {
            "user_id": user_id,
            "logs": [log.model_dump() for log in logs],
            "total": len(logs)
        }
    except Exception as e:
        logger.error(f"Error getting user activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile."""
    try:
        profile = await conversation_manager.get_or_create_user_profile(user_id)
        return profile.model_dump()
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Analytics Endpoints
# ============================================================================

@app.get("/api/users/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Get user statistics."""
    try:
        profile = await conversation_manager.get_or_create_user_profile(user_id)
        conversations = await conversation_manager.get_user_conversations(
            user_id=user_id,
            limit=1000
        )
        
        # Calculate additional stats
        total_messages_in_conversations = sum(
            len(c.messages) for c in conversations
        )
        
        return {
            "user_id": user_id,
            "total_conversations": profile.total_conversations,
            "total_messages": profile.total_messages,
            "total_tokens_used": profile.total_tokens_used,
            "total_messages_in_conversations": total_messages_in_conversations,
            "active_conversations": len([c for c in conversations if not c.is_archived]),
            "archived_conversations": len([c for c in conversations if c.is_archived]),
            "account_created": profile.created_at.isoformat(),
            "last_login": profile.last_login.isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
