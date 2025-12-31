"""
Rate limiting middleware using Redis for distributed rate limiting.
Implements sliding window algorithm for accurate rate limiting.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import redis.asyncio as redis
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_user_identifier(request: Request) -> str:
    """
    Get user identifier for rate limiting.
    Uses authenticated user ID if available, otherwise IP address.
    """
    # Try to get user from JWT token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from auth.jwt_handler import get_jwt_handler
            token = auth_header.split(" ")[1]
            jwt_handler = get_jwt_handler()
            token_data = jwt_handler.verify_token(token)
            if token_data:
                return f"user:{token_data.user_id}"
        except Exception:
            pass
    
    # Fallback to IP address
    return f"ip:{get_remote_address(request)}"


# Initialize limiter with Redis storage
limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["100/minute"],  # Global default
    storage_uri="redis://localhost:6379",  # Will be configured from settings
    strategy="moving-window",  # More accurate than fixed-window
)


def init_rate_limiter(redis_url: str):
    """
    Initialize rate limiter with Redis connection.
    
    Args:
        redis_url: Redis connection URL
    """
    global limiter
    limiter = Limiter(
        key_func=get_user_identifier,
        default_limits=["100/minute"],
        storage_uri=redis_url,
        strategy="moving-window",
    )
    logger.info("Rate limiter initialized with Redis storage")


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "auth": "10/minute",           # Login/register endpoints
    "chat": "30/minute",            # Chat endpoints
    "api": "60/minute",             # General API endpoints
    "download": "20/minute",        # File download endpoints
    "mcp": "40/minute",             # MCP endpoints
}
