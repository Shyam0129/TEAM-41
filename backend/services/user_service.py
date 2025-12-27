"""
User service for database operations.
Handles CRUD operations for users and Google OAuth token management.
"""

from datetime import datetime
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import secrets
import logging

from models.user import User, UserCreate, UserUpdate, UserResponse
from utils.config import get_settings

logger = logging.getLogger(__name__)


class UserService:
    """Service for user-related database operations"""
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """
        Initialize user service.
        
        Args:
            db: MongoDB database instance (optional, will use default if not provided)
        """
        if db:
            self.db = db
        else:
            settings = get_settings()
            client = AsyncIOMotorClient(settings.mongodb_url)
            # Use mongodb_database (the actual setting name) instead of mongodb_db_name
            db_name = getattr(settings, 'mongodb_db_name', settings.mongodb_database)
            self.db = client[db_name]
        
        self.users = self.db.users
    
    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user object
        """
        # Generate unique user_id
        user_id = f"user_{secrets.token_urlsafe(16)}"
        
        user_dict = {
            "user_id": user_id,
            "google_id": user_data.google_id,
            "email": user_data.email,
            "name": user_data.name,
            "picture": user_data.picture,
            "google_tokens": user_data.google_tokens,
            "auth_provider": "google",  # Set auth provider for OAuth users
            "is_active": True,
            "is_verified": True,
            "is_admin": False,
            "last_login": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "preferences": {
                "timezone": "UTC",
                "language": "en",
                "theme": "light",
                "notifications_enabled": True
            }
        }
        
        result = await self.users.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        logger.info(f"Created new user: {user_id} ({user_data.email})")
        return User(**user_dict)
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get user by internal user_id.
        
        Args:
            user_id: Internal user ID
            
        Returns:
            User object or None if not found
        """
        user_dict = await self.users.find_one({"user_id": user_id})
        return User(**user_dict) if user_dict else None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: User email
            
        Returns:
            User object or None if not found
        """
        user_dict = await self.users.find_one({"email": email})
        return User(**user_dict) if user_dict else None
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """
        Get user by Google ID.
        
        Args:
            google_id: Google user ID
            
        Returns:
            User object or None if not found
        """
        user_dict = await self.users.find_one({"google_id": google_id})
        return User(**user_dict) if user_dict else None
    
    async def update_user(self, user_id: str, update_data: UserUpdate) -> Optional[User]:
        """
        Update user information.
        
        Args:
            user_id: Internal user ID
            update_data: Data to update
            
        Returns:
            Updated user object or None if not found
        """
        # Build update dict (only include non-None values)
        update_dict = {
            k: v for k, v in update_data.dict(exclude_unset=True).items()
            if v is not None
        }
        
        if not update_dict:
            return await self.get_user_by_id(user_id)
        
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.users.update_one(
            {"user_id": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            return None
        
        logger.info(f"Updated user: {user_id}")
        return await self.get_user_by_id(user_id)
    
    async def update_google_tokens(self, user_id: str, tokens: dict) -> bool:
        """
        Update user's Google OAuth tokens.
        
        Args:
            user_id: Internal user ID
            tokens: New Google OAuth tokens
            
        Returns:
            True if updated successfully
        """
        result = await self.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "google_tokens": tokens,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated Google tokens for user: {user_id}")
            return True
        return False
    
    async def update_last_login(self, user_id: str) -> bool:
        """
        Update user's last login timestamp.
        
        Args:
            user_id: Internal user ID
            
        Returns:
            True if updated successfully
        """
        result = await self.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def create_or_update_user(
        self,
        google_id: str,
        email: str,
        name: str,
        picture: Optional[str],
        google_tokens: dict
    ) -> User:
        """
        Create new user or update existing user (used during OAuth flow).
        
        Args:
            google_id: Google user ID
            email: User email
            name: User name
            picture: Profile picture URL
            google_tokens: Google OAuth tokens
            
        Returns:
            User object (created or updated)
        """
        # Check if user exists
        existing_user = await self.get_user_by_google_id(google_id)
        
        if existing_user:
            # Update existing user
            await self.users.update_one(
                {"google_id": google_id},
                {
                    "$set": {
                        "name": name,
                        "picture": picture,
                        "google_tokens": google_tokens,
                        "auth_provider": "google",  # Ensure auth_provider is set
                        "last_login": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Updated existing user: {existing_user.user_id} ({email})")
            return await self.get_user_by_google_id(google_id)
        else:
            # Create new user
            user_data = UserCreate(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture,
                google_tokens=google_tokens
            )
            return await self.create_user(user_data)
    
    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a user (soft delete by setting is_active=False).
        
        Args:
            user_id: Internal user ID
            
        Returns:
            True if deleted successfully
        """
        result = await self.users.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Deactivated user: {user_id}")
            return True
        return False
    
    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> List[User]:
        """
        List users with pagination.
        
        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return
            active_only: Only return active users
            
        Returns:
            List of user objects
        """
        query = {"is_active": True} if active_only else {}
        
        cursor = self.users.find(query).skip(skip).limit(limit)
        users = []
        
        async for user_dict in cursor:
            users.append(User(**user_dict))
        
        return users
    
    async def get_user_count(self, active_only: bool = True) -> int:
        """
        Get total number of users.
        
        Args:
            active_only: Only count active users
            
        Returns:
            Number of users
        """
        query = {"is_active": True} if active_only else {}
        return await self.users.count_documents(query)
    
    def to_response(self, user: User) -> UserResponse:
        """
        Convert User model to UserResponse (excludes sensitive data).
        
        Args:
            user: User object
            
        Returns:
            UserResponse object
        """
        return UserResponse(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            username=getattr(user, 'username', None),
            picture=user.picture,
            auth_provider=getattr(user, 'auth_provider', 'google'),  # Default to 'google' for old users
            is_active=user.is_active,
            is_verified=user.is_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            preferences=user.preferences
        )
