"""
User data model for MongoDB.
Represents a user in the system with Google OAuth integration.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ],
        serialization=core_schema.plain_serializer_function_ser_schema(str))
    
    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")


class UserPreferences(BaseModel):
    """User preferences model"""
    timezone: str = "UTC"
    language: str = "en"
    theme: str = "light"
    notifications_enabled: bool = True


class User(BaseModel):
    """User model"""
    
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str = Field(..., description="Internal user ID")
    email: EmailStr = Field(..., description="User email address")
    name: str = Field(..., description="User full name")
    picture: Optional[str] = Field(None, description="User profile picture URL")
    
    # Google OAuth
    google_id: str = Field(..., description="Google user ID")
    google_tokens: Optional[Dict[str, Any]] = Field(None, description="Google OAuth tokens")
    
    # Account status
    is_active: bool = Field(default=True, description="Whether user account is active")
    is_verified: bool = Field(default=True, description="Whether user email is verified")
    is_admin: bool = Field(default=False, description="Whether user has admin privileges")
    
    # Timestamps
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    # Preferences
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="User preferences")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123xyz",
                "email": "user@example.com",
                "name": "John Doe",
                "picture": "https://lh3.googleusercontent.com/...",
                "google_id": "1234567890",
                "is_active": True,
                "is_verified": True,
                "preferences": {
                    "timezone": "America/New_York",
                    "language": "en"
                }
            }
        }


class UserCreate(BaseModel):
    """Model for creating a new user"""
    google_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    google_tokens: Dict[str, Any]


class UserUpdate(BaseModel):
    """Model for updating user information"""
    name: Optional[str] = None
    picture: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User response model (excludes sensitive data)"""
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    preferences: UserPreferences
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse
