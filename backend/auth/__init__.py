"""Authentication module initialization"""

from .oauth import oauth, get_google_oauth_client, GoogleOAuthConfig
from .jwt_handler import JWTHandler, TokenData, get_jwt_handler, init_jwt_handler
from .dependencies import (
    get_current_user,
    get_current_active_user,
    get_optional_user,
    get_user_google_credentials,
    require_admin
)

__all__ = [
    'oauth',
    'get_google_oauth_client',
    'GoogleOAuthConfig',
    'JWTHandler',
    'TokenData',
    'get_jwt_handler',
    'init_jwt_handler',
    'get_current_user',
    'get_current_active_user',
    'get_optional_user',
    'get_user_google_credentials',
    'require_admin',
]
