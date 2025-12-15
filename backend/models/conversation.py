"""Conversation and User Activity Models for MongoDB."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """Message role types."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationMessage(BaseModel):
    """Individual message in a conversation."""
    id: str = Field(..., description="Unique message identifier")
    role: MessageRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="Tool calls made in this message")
    tokens_used: Optional[int] = Field(None, description="Tokens used for this message")


class Conversation(BaseModel):
    """Complete conversation model."""
    conversation_id: str = Field(..., description="Unique conversation identifier")
    user_id: str = Field(..., description="User identifier")
    session_id: str = Field(..., description="Session identifier")
    title: Optional[str] = Field(None, description="Conversation title (auto-generated from first message)")
    messages: List[ConversationMessage] = Field(default_factory=list, description="List of messages")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    is_archived: bool = Field(False, description="Whether conversation is archived")
    total_tokens: int = Field(0, description="Total tokens used in conversation")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "conversation_id": "conv_123",
                "user_id": "user_456",
                "session_id": "sess_789",
                "title": "Email to John about meeting",
                "messages": [],
                "created_at": "2024-12-14T09:00:00",
                "updated_at": "2024-12-14T09:05:00",
                "is_archived": False,
                "total_tokens": 150
            }
        }


class UserActivityLog(BaseModel):
    """User activity log entry."""
    log_id: str = Field(..., description="Unique log identifier")
    user_id: str = Field(..., description="User identifier")
    session_id: str = Field(..., description="Session identifier")
    activity_type: str = Field(..., description="Type of activity (message, tool_call, error, etc.)")
    description: str = Field(..., description="Activity description")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Activity timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    ip_address: Optional[str] = Field(None, description="User IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")


class UserSession(BaseModel):
    """User session model."""
    session_id: str = Field(..., description="Unique session identifier")
    user_id: str = Field(..., description="User identifier")
    conversation_ids: List[str] = Field(default_factory=list, description="List of conversation IDs in this session")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Session start time")
    last_activity: datetime = Field(default_factory=datetime.utcnow, description="Last activity timestamp")
    is_active: bool = Field(True, description="Whether session is active")
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Device information")
    total_messages: int = Field(0, description="Total messages in session")
    total_tokens: int = Field(0, description="Total tokens used in session")


class UserProfile(BaseModel):
    """User profile model."""
    user_id: str = Field(..., description="Unique user identifier")
    username: Optional[str] = Field(None, description="Username")
    email: Optional[str] = Field(None, description="User email")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    last_login: datetime = Field(default_factory=datetime.utcnow, description="Last login timestamp")
    total_conversations: int = Field(0, description="Total conversations")
    total_messages: int = Field(0, description="Total messages sent")
    total_tokens_used: int = Field(0, description="Total tokens used")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User preferences")
    connected_tools: List[str] = Field(default_factory=list, description="List of connected tools")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
