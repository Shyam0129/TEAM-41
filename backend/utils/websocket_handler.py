"""WebSocket handler for real-time chat streaming."""
import logging
import json
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from models.schema import ConversationStatus, ToolType
from models.conversation import MessageRole
from utils.conversation_manager import ConversationManager
from utils.state_manager import StateManager
from utils.llm_router import LLMRouter
from utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            if websocket.client_state == WebSocketState.CONNECTED:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {client_id}: {e}")
                    self.disconnect(client_id)

    async def send_stream_chunk(self, client_id: str, chunk: str, metadata: Optional[Dict] = None):
        """Send a streaming chunk to a client."""
        message = {
            "type": "stream",
            "chunk": chunk,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_message(client_id, message)

    async def send_complete(self, client_id: str, full_response: str, metadata: Optional[Dict] = None):
        """Send completion message to a client."""
        message = {
            "type": "complete",
            "response": full_response,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_message(client_id, message)

    async def send_error(self, client_id: str, error: str):
        """Send error message to a client."""
        message = {
            "type": "error",
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_message(client_id, message)

    async def send_status(self, client_id: str, status: str, details: Optional[str] = None):
        """Send status update to a client."""
        message = {
            "type": "status",
            "status": status,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_message(client_id, message)


class WebSocketChatHandler:
    """Handles WebSocket chat interactions."""

    def __init__(
        self,
        conversation_manager: ConversationManager,
        state_manager: StateManager,
        connection_manager: ConnectionManager
    ):
        """Initialize WebSocket chat handler."""
        self.conversation_manager = conversation_manager
        self.state_manager = state_manager
        self.connection_manager = connection_manager

    async def handle_connection(
        self,
        websocket: WebSocket,
        user_id: str,
        session_id: Optional[str] = None
    ):
        """Handle a WebSocket connection."""
        client_id = f"{user_id}_{uuid.uuid4().hex[:8]}"
        
        try:
            # Connect the WebSocket
            await self.connection_manager.connect(websocket, client_id)
            
            # Create or get session
            if not session_id:
                session = await self.conversation_manager.create_session(user_id)
                session_id = session.session_id
            else:
                session = await self.conversation_manager.get_session(session_id)
                if not session:
                    session = await self.conversation_manager.create_session(user_id)
                    session_id = session.session_id
            
            # Send connection confirmation
            await self.connection_manager.send_message(client_id, {
                "type": "connected",
                "session_id": session_id,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Log activity
            await self.conversation_manager.log_activity(
                user_id=user_id,
                session_id=session_id,
                activity_type="websocket_connect",
                description="WebSocket connection established"
            )
            
            # Listen for messages
            while True:
                try:
                    data = await websocket.receive_json()
                    await self.handle_message(client_id, user_id, session_id, data)
                except WebSocketDisconnect:
                    logger.info(f"Client {client_id} disconnected")
                    break
                except json.JSONDecodeError:
                    await self.connection_manager.send_error(
                        client_id,
                        "Invalid JSON format"
                    )
                except Exception as e:
                    logger.error(f"Error handling message from {client_id}: {e}")
                    await self.connection_manager.send_error(
                        client_id,
                        f"Error processing message: {str(e)}"
                    )
        
        except Exception as e:
            logger.error(f"Error in WebSocket connection for {client_id}: {e}")
        
        finally:
            # Cleanup
            self.connection_manager.disconnect(client_id)
            
            # Log disconnection
            if session_id:
                await self.conversation_manager.log_activity(
                    user_id=user_id,
                    session_id=session_id,
                    activity_type="websocket_disconnect",
                    description="WebSocket connection closed"
                )

    async def handle_message(
        self,
        client_id: str,
        user_id: str,
        session_id: str,
        data: Dict[str, Any]
    ):
        """Handle incoming WebSocket message."""
        message_type = data.get("type", "chat")
        
        if message_type == "chat":
            await self.handle_chat_message(client_id, user_id, session_id, data)
        elif message_type == "ping":
            await self.connection_manager.send_message(client_id, {"type": "pong"})
        elif message_type == "get_history":
            await self.handle_get_history(client_id, user_id, session_id, data)
        elif message_type == "new_conversation":
            await self.handle_new_conversation(client_id, user_id, session_id)
        else:
            await self.connection_manager.send_error(
                client_id,
                f"Unknown message type: {message_type}"
            )

    async def handle_chat_message(
        self,
        client_id: str,
        user_id: str,
        session_id: str,
        data: Dict[str, Any]
    ):
        """Handle a chat message."""
        user_message = data.get("message", "")
        conversation_id = data.get("conversation_id")
        
        if not user_message:
            await self.connection_manager.send_error(client_id, "Empty message")
            return
        
        try:
            # Send status: processing
            await self.connection_manager.send_status(
                client_id,
                "processing",
                "Processing your message..."
            )
            
            # Create or get conversation
            if not conversation_id:
                conversation = await self.conversation_manager.create_conversation(
                    user_id=user_id,
                    session_id=session_id,
                    first_message=user_message
                )
                conversation_id = conversation.conversation_id
                
                # Send conversation ID to client
                await self.connection_manager.send_message(client_id, {
                    "type": "conversation_created",
                    "conversation_id": conversation_id,
                    "title": conversation.title
                })
            
            # Add user message to conversation
            await self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role=MessageRole.USER,
                content=user_message,
                metadata={"client_id": client_id}
            )
            
            # Update session activity
            await self.conversation_manager.update_session_activity(
                session_id=session_id,
                conversation_id=conversation_id
            )
            
            # Log activity
            await self.conversation_manager.log_activity(
                user_id=user_id,
                session_id=session_id,
                activity_type="message_sent",
                description=f"User sent message in conversation {conversation_id}",
                metadata={"conversation_id": conversation_id, "message_length": len(user_message)}
            )
            
            # Get LLM client and process message
            # This will be integrated with your existing LLM router
            response_text = await self.process_with_llm(
                client_id=client_id,
                user_id=user_id,
                session_id=session_id,
                conversation_id=conversation_id,
                message=user_message
            )
            
            # Add assistant response to conversation
            await self.conversation_manager.add_message(
                conversation_id=conversation_id,
                role=MessageRole.ASSISTANT,
                content=response_text,
                metadata={"client_id": client_id}
            )
            
            # Update user stats
            await self.conversation_manager.update_user_stats(
                user_id=user_id,
                messages_increment=2  # user + assistant
            )
            
            # Send completion
            await self.connection_manager.send_complete(
                client_id,
                response_text,
                metadata={
                    "conversation_id": conversation_id,
                    "session_id": session_id
                }
            )
        
        except Exception as e:
            logger.error(f"Error handling chat message: {e}")
            await self.connection_manager.send_error(client_id, str(e))
            
            # Log error
            await self.conversation_manager.log_activity(
                user_id=user_id,
                session_id=session_id,
                activity_type="error",
                description=f"Error processing message: {str(e)}",
                metadata={"error": str(e)}
            )

    async def process_with_llm(
        self,
        client_id: str,
        user_id: str,
        session_id: str,
        conversation_id: str,
        message: str
    ) -> str:
        """Process message with LLM and stream response."""
        # This is a placeholder - will be integrated with your existing LLM router
        # For now, we'll simulate streaming
        
        await self.connection_manager.send_status(
            client_id,
            "generating",
            "Generating response..."
        )
        
        # Simulate streaming response
        response = "This is a placeholder response. Integration with LLM router will be done in the next step."
        
        # Stream the response word by word
        words = response.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            await self.connection_manager.send_stream_chunk(client_id, chunk)
            # Small delay to simulate streaming
            import asyncio
            await asyncio.sleep(0.05)
        
        return response

    async def handle_get_history(
        self,
        client_id: str,
        user_id: str,
        session_id: str,
        data: Dict[str, Any]
    ):
        """Handle request to get conversation history."""
        conversation_id = data.get("conversation_id")
        limit = data.get("limit", 50)
        
        if conversation_id:
            # Get specific conversation
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if conversation:
                await self.connection_manager.send_message(client_id, {
                    "type": "conversation_history",
                    "conversation": conversation.model_dump()
                })
            else:
                await self.connection_manager.send_error(client_id, "Conversation not found")
        else:
            # Get all user conversations
            conversations = await self.conversation_manager.get_user_conversations(
                user_id=user_id,
                limit=limit
            )
            await self.connection_manager.send_message(client_id, {
                "type": "conversations_list",
                "conversations": [c.model_dump() for c in conversations]
            })

    async def handle_new_conversation(
        self,
        client_id: str,
        user_id: str,
        session_id: str
    ):
        """Handle request to start a new conversation."""
        conversation = await self.conversation_manager.create_conversation(
            user_id=user_id,
            session_id=session_id
        )
        
        await self.connection_manager.send_message(client_id, {
            "type": "conversation_created",
            "conversation_id": conversation.conversation_id,
            "title": conversation.title or "New Conversation"
        })
