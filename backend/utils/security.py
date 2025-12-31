"""
Security utilities for input validation and sanitization.
"""

import re
import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


def validate_filename(filename: str, allowed_extensions: Optional[list] = None) -> str:
    """
    Validate and sanitize filename to prevent path traversal attacks.
    
    Args:
        filename: The filename to validate
        allowed_extensions: List of allowed file extensions (e.g., ['.pdf', '.docx'])
        
    Returns:
        Sanitized filename
        
    Raises:
        HTTPException: If filename is invalid or contains malicious patterns
    """
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty"
        )
    
    # Check for path traversal attempts
    if ".." in filename or "/" in filename or "\\" in filename:
        logger.warning(f"Path traversal attempt detected: {filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal detected"
        )
    
    # Check for null bytes
    if "\x00" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: null byte detected"
        )
    
    # Validate filename pattern (alphanumeric, dots, dashes, underscores only)
    if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: contains illegal characters"
        )
    
    # Check file extension if specified
    if allowed_extensions:
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
    
    return filename


def validate_user_id(user_id: str) -> str:
    """
    Validate user ID format.
    
    Args:
        user_id: User ID to validate
        
    Returns:
        Validated user ID
        
    Raises:
        HTTPException: If user ID format is invalid
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID cannot be empty"
        )
    
    # User IDs should follow pattern: user_<alphanumeric>
    if not re.match(r'^user_[a-zA-Z0-9_-]+$', user_id) and user_id != 'anonymous':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    return user_id


def validate_conversation_id(conversation_id: str) -> str:
    """
    Validate conversation ID format.
    
    Args:
        conversation_id: Conversation ID to validate
        
    Returns:
        Validated conversation ID
        
    Raises:
        HTTPException: If conversation ID format is invalid
    """
    if not conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation ID cannot be empty"
        )
    
    # Conversation IDs should be alphanumeric with underscores/dashes
    if not re.match(r'^[a-zA-Z0-9_-]+$', conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format"
        )
    
    return conversation_id


def validate_session_id(session_id: str) -> str:
    """
    Validate session ID format.
    
    Args:
        session_id: Session ID to validate
        
    Returns:
        Validated session ID
        
    Raises:
        HTTPException: If session ID format is invalid
    """
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session ID cannot be empty"
        )
    
    # Session IDs should be alphanumeric with underscores/dashes
    if not re.match(r'^[a-zA-Z0-9_-]+$', session_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )
    
    return session_id


def sanitize_message_content(content: str, max_length: int = 10000) -> str:
    """
    Sanitize message content to prevent injection attacks.
    
    Args:
        content: Message content to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized content
        
    Raises:
        HTTPException: If content is invalid
    """
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty"
        )
    
    if len(content) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message content too long (max {max_length} characters)"
        )
    
    # Remove null bytes
    content = content.replace("\x00", "")
    
    return content


def get_safe_file_path(base_dir: str, filename: str) -> Path:
    """
    Construct a safe file path preventing directory traversal.
    
    Args:
        base_dir: Base directory for files
        filename: Filename (already validated)
        
    Returns:
        Safe absolute path
        
    Raises:
        HTTPException: If resulting path is outside base directory
    """
    base_path = Path(base_dir).resolve()
    file_path = (base_path / filename).resolve()
    
    # Ensure the resolved path is within base directory
    if not str(file_path).startswith(str(base_path)):
        logger.error(f"Path traversal attempt: {filename} -> {file_path}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )
    
    return file_path
