"""
Authentication routes for Google OAuth and JWT management.
Handles login, callback, logout, and token refresh.
"""

from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
import logging

from auth.oauth import oauth, GoogleOAuthConfig
from auth.jwt_handler import get_jwt_handler
from auth.dependencies import get_current_user, get_current_active_user
from services.user_service import UserService
from models.user import User, TokenResponse, UserResponse
from utils.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/login")
async def login(request: Request, redirect_url: Optional[str] = None):
    """
    Initiate Google OAuth login flow.
    
    Args:
        request: FastAPI request object
        redirect_url: Optional URL to redirect to after successful login
        
    Returns:
        Redirect to Google OAuth consent screen
    """
    settings = get_settings()
    
    # Validate OAuth configuration
    oauth_config = GoogleOAuthConfig()
    if not oauth_config.validate():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
        )
    
    # Build callback URL
    callback_url = str(request.url_for('auth_callback'))
    
    # Store redirect_url in session if provided
    if redirect_url:
        request.session['redirect_url'] = redirect_url
    
    logger.info(f"Initiating OAuth flow with callback: {callback_url}")
    
    # Redirect to Google OAuth
    return await oauth.google.authorize_redirect(request, callback_url)


@router.get("/callback")
async def auth_callback(request: Request):
    """
    Handle Google OAuth callback.
    
    Args:
        request: FastAPI request object with OAuth code
        
    Returns:
        Redirect to frontend with JWT tokens
    """
    settings = get_settings()
    
    try:
        # Exchange authorization code for access token
        token = await oauth.google.authorize_access_token(request)
        
        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from Google"
            )
        
        logger.info(f"OAuth callback for user: {user_info.get('email')}")
        
        # Prepare Google tokens for storage
        google_tokens = {
            'access_token': token.get('access_token'),
            'refresh_token': token.get('refresh_token'),
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': settings.google_client_id,
            'client_secret': settings.google_client_secret,
            'scopes': token.get('scope', '').split(),
            'expiry': token.get('expires_at')
        }
        
        # Create or update user in database
        user_service = UserService()
        user = await user_service.create_or_update_user(
            google_id=user_info['sub'],
            email=user_info['email'],
            name=user_info.get('name', user_info['email']),
            picture=user_info.get('picture'),
            google_tokens=google_tokens
        )
        
        # Create JWT tokens for our app
        jwt_handler = get_jwt_handler()
        access_token = jwt_handler.create_access_token(
            data={"sub": user.user_id, "email": user.email}
        )
        refresh_token = jwt_handler.create_refresh_token(
            data={"sub": user.user_id, "email": user.email}
        )
        
        # Get redirect URL from session or use default
        redirect_url = request.session.pop('redirect_url', settings.frontend_url)
        
        # Build frontend callback URL with tokens
        frontend_callback = f"{redirect_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        
        logger.info(f"OAuth successful for user: {user.user_id}")
        
        return RedirectResponse(url=frontend_callback)
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}", exc_info=True)
        
        # Redirect to frontend with error
        error_url = f"{settings.frontend_url}/auth/error?message={str(e)}"
        return RedirectResponse(url=error_url)


@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_token: Valid refresh token
        
    Returns:
        New access token
    """
    jwt_handler = get_jwt_handler()
    
    # Verify refresh token and create new access token
    new_access_token = jwt_handler.refresh_access_token(refresh_token)
    
    if not new_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Logout current user.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    # In a production system, you would:
    # 1. Add the token to a blacklist in Redis
    # 2. Clear any server-side sessions
    # 3. Optionally revoke Google OAuth tokens
    
    logger.info(f"User logged out: {current_user.user_id}")
    
    return {
        "message": "Logged out successfully",
        "user_id": current_user.user_id
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        User information
    """
    user_service = UserService()
    return user_service.to_response(current_user)


@router.delete("/account")
async def delete_account(current_user: User = Depends(get_current_active_user)):
    """
    Delete current user account (soft delete).
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Success message
    """
    user_service = UserService()
    success = await user_service.delete_user(current_user.user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
    
    logger.info(f"User account deleted: {current_user.user_id}")
    
    return {
        "message": "Account deleted successfully",
        "user_id": current_user.user_id
    }


@router.get("/status")
async def auth_status():
    """
    Check authentication system status.
    
    Returns:
        OAuth configuration status
    """
    oauth_config = GoogleOAuthConfig()
    
    return {
        "oauth_configured": oauth_config.validate(),
        "scopes": oauth_config.scopes,
        "redirect_uri": oauth_config.redirect_uri
    }
