"""
Helper utilities for Google OAuth token management.
"""

from google.oauth2.credentials import Credentials
from typing import Dict, Any
from utils.config import get_settings
import logging

logger = logging.getLogger(__name__)


def create_google_credentials(google_tokens: Dict[str, Any]) -> Credentials:
    """
    Create Google OAuth credentials from stored tokens.
    
    SECURITY: Client ID and secret are fetched from environment variables,
    NOT from the database. This prevents credential leakage.
    
    Args:
        google_tokens: Dictionary containing access_token, refresh_token, etc.
        
    Returns:
        Google Credentials object
    """
    settings = get_settings()
    
    return Credentials(
        token=google_tokens.get('access_token'),
        refresh_token=google_tokens.get('refresh_token'),
        token_uri=google_tokens.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=settings.google_client_id,  # From environment, not database
        client_secret=settings.google_client_secret,  # From environment, not database
        scopes=google_tokens.get('scopes', [])
    )


def update_google_tokens_dict(creds: Credentials) -> Dict[str, Any]:
    """
    Convert Google Credentials to dictionary for storage.
    
    SECURITY: Does NOT include client_id or client_secret.
    
    Args:
        creds: Google Credentials object
        
    Returns:
        Dictionary with tokens (no secrets)
    """
    return {
        'access_token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'scopes': creds.scopes,
        'expiry': creds.expiry.isoformat() if creds.expiry else None
    }
