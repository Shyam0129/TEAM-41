"""
FastAPI dependencies for authentication.
Provides dependency injection for protected routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from auth.jwt_handler import get_jwt_handler, TokenData
from services.user_service import UserService
from models.user import User

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Args:
        credentials: HTTP Bearer token from request header
        
    Returns:
        Authenticated user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    # Verify JWT token
    jwt_handler = get_jwt_handler()
    token_data = jwt_handler.verify_token(token, token_type="access")
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_service = UserService()
    user = await user_service.get_user_by_id(token_data.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get the current active user.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        Active user object
        
    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """
    Dependency to get the current user if authenticated, None otherwise.
    Useful for endpoints that work for both authenticated and anonymous users.
    
    Args:
        credentials: Optional HTTP Bearer token
        
    Returns:
        User object if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_user_google_credentials(
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Dependency to get the current user's Google OAuth credentials.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Google OAuth credentials dictionary
        
    Raises:
        HTTPException: If user doesn't have Google credentials
    """
    if not current_user.google_tokens:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has not connected their Google account"
        )
    
    # Check if token is expired and refresh if needed
    from google.auth.transport.requests import Request
    from utils.google_auth_helper import create_google_credentials, update_google_tokens_dict
    
    # Create credentials using helper (gets client_id/secret from environment)
    creds = create_google_credentials(current_user.google_tokens)
    
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        logger.info(f"Refreshing Google token for user {current_user.user_id}")
        try:
            creds.refresh(Request())
            
            # Update user's tokens in database (without client secrets)
            user_service = UserService()
            updated_tokens = update_google_tokens_dict(creds)
            await user_service.update_google_tokens(
                current_user.user_id,
                updated_tokens
            )
            
            return updated_tokens
        except Exception as e:
            logger.error(f"Failed to refresh Google token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication expired. Please reconnect your Google account."
            )
    
    return current_user.google_tokens


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin privileges.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        User object if admin
        
    Raises:
        HTTPException: If user is not an admin
    """
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
