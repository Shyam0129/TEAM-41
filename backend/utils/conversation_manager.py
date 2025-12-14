"""Conversation Manager for handling conversation history and persistence."""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from models.conversation import (
    Conversation,
    ConversationMessage,
    MessageRole,
    UserActivityLog,
    UserSession,
    UserProfile
)
from db.mongo_client import MongoDBClient

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manages conversation history and user sessions."""

    def __init__(self, mongodb_client: MongoDBClient):
        """Initialize conversation manager."""
        self.db = mongodb_client
        self.conversations_collection = "conversations"
        self.sessions_collection = "user_sessions"
        self.activity_logs_collection = "activity_logs"
        self.user_profiles_collection = "user_profiles"

    async def create_conversation(
        self,
        user_id: str,
        session_id: str,
        first_message: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation."""
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        
        # Generate title from first message if provided
        title = None
        if first_message:
            title = self._generate_title(first_message)
        
        conversation = Conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            session_id=session_id,
            title=title,
            messages=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Save to MongoDB
        await self.db.insert_one(
            self.conversations_collection,
            conversation.model_dump()
        )
        
        logger.info(f"Created conversation {conversation_id} for user {user_id}")
        return conversation

    async def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        tokens_used: Optional[int] = None
    ) -> ConversationMessage:
        """Add a message to a conversation."""
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        
        message = ConversationMessage(
            id=message_id,
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            metadata=metadata or {},
            tool_calls=tool_calls,
            tokens_used=tokens_used
        )
        
        # Update conversation in MongoDB
        await self.db.update_one(
            self.conversations_collection,
            {"conversation_id": conversation_id},
            {
                "$push": {"messages": message.model_dump()},
                "$set": {"updated_at": datetime.utcnow()},
                "$inc": {"total_tokens": tokens_used or 0}
            }
        )
        
        logger.info(f"Added {role} message to conversation {conversation_id}")
        return message

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        data = await self.db.find_one(
            self.conversations_collection,
            {"conversation_id": conversation_id}
        )
        
        if data:
            return Conversation(**data)
        return None

    async def get_user_conversations(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        include_archived: bool = False
    ) -> List[Conversation]:
        """Get all conversations for a user."""
        query = {"user_id": user_id}
        if not include_archived:
            query["is_archived"] = False
        
        cursor = self.db.db[self.conversations_collection].find(query).sort(
            "updated_at", -1
        ).skip(skip).limit(limit)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        
        return conversations

    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[ConversationMessage]:
        """Get message history for a conversation."""
        conversation = await self.get_conversation(conversation_id)
        
        if not conversation:
            return []
        
        messages = conversation.messages
        if limit:
            messages = messages[-limit:]
        
        return messages

    async def update_conversation_title(
        self,
        conversation_id: str,
        title: str
    ) -> bool:
        """Update conversation title."""
        result = await self.db.update_one(
            self.conversations_collection,
            {"conversation_id": conversation_id},
            {"$set": {"title": title, "updated_at": datetime.utcnow()}}
        )
        return result > 0

    async def archive_conversation(self, conversation_id: str) -> bool:
        """Archive a conversation."""
        result = await self.db.update_one(
            self.conversations_collection,
            {"conversation_id": conversation_id},
            {"$set": {"is_archived": True, "updated_at": datetime.utcnow()}}
        )
        return result > 0

    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        result = await self.db.delete_one(
            self.conversations_collection,
            {"conversation_id": conversation_id}
        )
        return result > 0

    # Session Management
    async def create_session(
        self,
        user_id: str,
        device_info: Optional[Dict[str, Any]] = None
    ) -> UserSession:
        """Create a new user session."""
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            conversation_ids=[],
            started_at=datetime.utcnow(),
            last_activity=datetime.utcnow(),
            is_active=True,
            device_info=device_info or {}
        )
        
        await self.db.insert_one(
            self.sessions_collection,
            session.model_dump()
        )
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session

    async def get_session(self, session_id: str) -> Optional[UserSession]:
        """Get a session by ID."""
        data = await self.db.find_one(
            self.sessions_collection,
            {"session_id": session_id}
        )
        
        if data:
            return UserSession(**data)
        return None

    async def update_session_activity(
        self,
        session_id: str,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Update session last activity."""
        update_data = {"last_activity": datetime.utcnow()}
        
        if conversation_id:
            update_data["$addToSet"] = {"conversation_ids": conversation_id}
            update_data["$inc"] = {"total_messages": 1}
        
        result = await self.db.update_one(
            self.sessions_collection,
            {"session_id": session_id},
            {"$set": update_data}
        )
        return result > 0

    async def end_session(self, session_id: str) -> bool:
        """End a user session."""
        result = await self.db.update_one(
            self.sessions_collection,
            {"session_id": session_id},
            {"$set": {"is_active": False, "last_activity": datetime.utcnow()}}
        )
        return result > 0

    # Activity Logging
    async def log_activity(
        self,
        user_id: str,
        session_id: str,
        activity_type: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserActivityLog:
        """Log user activity."""
        log_id = f"log_{uuid.uuid4().hex[:12]}"
        
        activity_log = UserActivityLog(
            log_id=log_id,
            user_id=user_id,
            session_id=session_id,
            activity_type=activity_type,
            description=description,
            timestamp=datetime.utcnow(),
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        await self.db.insert_one(
            self.activity_logs_collection,
            activity_log.model_dump()
        )
        
        return activity_log

    async def get_user_activity_logs(
        self,
        user_id: str,
        limit: int = 100,
        activity_type: Optional[str] = None
    ) -> List[UserActivityLog]:
        """Get user activity logs."""
        query = {"user_id": user_id}
        if activity_type:
            query["activity_type"] = activity_type
        
        cursor = self.db.db[self.activity_logs_collection].find(query).sort(
            "timestamp", -1
        ).limit(limit)
        
        logs = []
        async for doc in cursor:
            logs.append(UserActivityLog(**doc))
        
        return logs

    # User Profile Management
    async def get_or_create_user_profile(self, user_id: str) -> UserProfile:
        """Get or create user profile."""
        data = await self.db.find_one(
            self.user_profiles_collection,
            {"user_id": user_id}
        )
        
        if data:
            return UserProfile(**data)
        
        # Create new profile
        profile = UserProfile(
            user_id=user_id,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        
        await self.db.insert_one(
            self.user_profiles_collection,
            profile.model_dump()
        )
        
        logger.info(f"Created user profile for {user_id}")
        return profile

    async def update_user_stats(
        self,
        user_id: str,
        messages_increment: int = 0,
        tokens_increment: int = 0,
        conversations_increment: int = 0
    ) -> bool:
        """Update user statistics."""
        update_data = {
            "last_login": datetime.utcnow(),
            "$inc": {}
        }
        
        if messages_increment:
            update_data["$inc"]["total_messages"] = messages_increment
        if tokens_increment:
            update_data["$inc"]["total_tokens_used"] = tokens_increment
        if conversations_increment:
            update_data["$inc"]["total_conversations"] = conversations_increment
        
        result = await self.db.update_one(
            self.user_profiles_collection,
            {"user_id": user_id},
            update_data
        )
        return result > 0

    def _generate_title(self, message: str, max_length: int = 50) -> str:
        """Generate a title from the first message."""
        # Remove extra whitespace
        title = " ".join(message.split())
        
        # Truncate if too long
        if len(title) > max_length:
            title = title[:max_length].rsplit(' ', 1)[0] + "..."
        
        return title
