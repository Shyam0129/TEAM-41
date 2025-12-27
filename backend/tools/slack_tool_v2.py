"""
Slack Tool V2 - Enhanced Slack integration for multi-user environment.
"""
from typing import Dict, Any, List, Optional
import logging
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

logger = logging.getLogger(__name__)

class SlackToolV2:
    """Slack API tool for messaging and channel management."""
    
    def __init__(self, token: str):
        """
        Initialize Slack tool.
        
        Args:
            token: Slack bot token (or user token if implemented later)
        """
        self.client = WebClient(token=token)
    
    def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a message to a Slack channel."""
        try:
            response = self.client.chat_postMessage(
                channel=channel,
                text=text,
                thread_ts=thread_ts
            )
            logger.info(f"Slack message sent to {channel}")
            return response.data
        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            raise Exception(f"Slack error: {e.response['error']}")
    
    def send_direct_message(self, user_id: str, text: str) -> Dict[str, Any]:
        """Send a direct message to a user."""
        try:
            response = self.client.conversations_open(users=[user_id])
            if not response["ok"]:
                raise Exception(f"Failed to open DM: {response['error']}")
            
            channel_id = response['channel']['id']
            return self.send_message(channel_id, text)
        except SlackApiError as e:
            logger.error(f"Slack DM error: {e.response['error']}")
            raise Exception(f"Slack error: {e.response['error']}")

    def list_channels(self) -> List[Dict[str, Any]]:
        """List public channels."""
        try:
            response = self.client.conversations_list(types="public_channel")
            return response['channels']
        except SlackApiError as e:
            logger.error(f"Slack list channels error: {e.response['error']}")
            raise

    def upload_file(
        self,
        channels: List[str],
        file_path: str,
        title: Optional[str] = None,
        initial_comment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload a file to Slack."""
        try:
            # Note: files_upload_v2 is the recommended method
            response = self.client.files_upload_v2(
                channel=channels[0] if channels else None, # v2 handles single channel easier
                file=file_path,
                title=title,
                initial_comment=initial_comment
            )
            return response.data
        except SlackApiError as e:
            logger.error(f"Slack file upload error: {e.response['error']}")
            raise
