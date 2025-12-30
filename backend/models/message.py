"""Message model for individual chat messages."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class Message(BaseModel):
    """Individual message in a conversation."""
    message_id: str = Field(..., description="Unique message identifier")
    conversation_id: str = Field(..., description="Parent conversation ID")
    user_id: str = Field(..., description="User who owns this conversation")
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed by this message")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="Tool calls made in this message")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "msg_abc123",
                "conversation_id": "conv_xyz789",
                "user_id": "user_123",
                "role": "user",
                "content": "What is photosynthesis?",
                "timestamp": "2024-12-30T10:00:00",
                "tokens_used": 0,
                "tool_calls": None,
                "metadata": {}
            }
        }
