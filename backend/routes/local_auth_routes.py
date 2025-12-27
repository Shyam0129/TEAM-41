"""
Additional authentication routes for local auth (email/password).
"""

from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import logging
import uuid

from auth.jwt_handler import get_jwt_handler
from auth.password import hash_password, verify_password
from services.user_service import UserService
from models.user import UserRegister, UserLogin, RefreshTokenRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)

# This router will be included in the main auth router
local_auth_router = APIRouter()


@local_auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """
    Register a new user with email and password.
    
    Args:
        user_data: User registration data
        
    Returns:
        JWT tokens and user information
    """
    user_service = UserService()
    jwt_handler = get_jwt_handler()
    
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username is taken
    existing_username = await user_service.db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Hash password
    password_hash_value = hash_password(user_data.password)
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    user_dict = {
        "user_id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "name": user_data.name,
        "password_hash": password_hash_value,
        "auth_provider": "local",
        "is_active": True,
        "is_verified": False,  # Email verification can be added later
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await user_service.db.users.insert_one(user_dict)
    
    if not result.inserted_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Get created user
    user = await user_service.get_user_by_id(user_id)
    
    # Generate tokens
    access_token = jwt_handler.create_access_token(
        data={"sub": user.user_id, "email": user.email}
    )
    refresh_token = jwt_handler.create_refresh_token(
        data={"sub": user.user_id}
    )
    
    # Update last login
    await user_service.update_last_login(user.user_id)
    
    logger.info(f"New user registered: {user.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=jwt_handler.access_token_expire_minutes * 60,
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            username=user.username,
            picture=user.picture,
            auth_provider=user.auth_provider,
            is_active=user.is_active,
            is_verified=user.is_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            preferences=user.preferences
        )
    )


@local_auth_router.post("/login", response_model=TokenResponse)
async def login_local(credentials: UserLogin):
    """
    Login with email and password.
    
    Args:
        credentials: User login credentials
        
    Returns:
        JWT tokens and user information
    """
    user_service = UserService()
    jwt_handler = get_jwt_handler()
    
    # Get user by email
    user = await user_service.get_user_by_email(credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user uses local auth
    if user.auth_provider != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account uses {user.auth_provider} authentication. Please use 'Continue with Google'."
        )
    
    # Verify password
    if not user.password_hash or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Generate tokens
    access_token = jwt_handler.create_access_token(
        data={"sub": user.user_id, "email": user.email}
    )
    refresh_token = jwt_handler.create_refresh_token(
        data={"sub": user.user_id}
    )
    
    # Update last login
    await user_service.update_last_login(user.user_id)
    
    logger.info(f"User logged in: {user.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=jwt_handler.access_token_expire_minutes * 60,
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            username=user.username,
            picture=user.picture,
            auth_provider=user.auth_provider,
            is_active=user.is_active,
            is_verified=user.is_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            preferences=user.preferences
        )
    )


@local_auth_router.post("/refresh")
async def refresh_token(token_request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    
    Args:
        token_request: Refresh token
        
    Returns:
        New access token
    """
    jwt_handler = get_jwt_handler()
    user_service = UserService()
    
    # Verify refresh token
    token_data = jwt_handler.verify_token(token_request.refresh_token, token_type="refresh")
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Get user to ensure they still exist and are active
    user = await user_service.get_user_by_id(token_data.user_id)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new access token
    new_access_token = jwt_handler.create_access_token(
        data={"sub": user.user_id, "email": user.email}
    )
    
    logger.info(f"Token refreshed for user: {user.email}")
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": jwt_handler.access_token_expire_minutes * 60
    }
