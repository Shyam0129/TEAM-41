"""
Gmail Tool V2 - Uses Google OAuth credentials directly (multi-user).
No token.json file needed - uses credentials from database.
"""

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from email.mime.text import MIMEText
import base64
import logging

logger = logging.getLogger(__name__)


class GmailToolV2:
    """Gmail tool that uses Google OAuth credentials directly"""
    
    def __init__(self, credentials: Credentials):
        """
        Initialize Gmail tool with Google credentials.
        
        Args:
            credentials: Google OAuth2 credentials object
        """
        self.credentials = credentials
        self.service = None
    
    def _get_service(self):
        """Get or create Gmail API service"""
        if not self.service:
            self.service = build('gmail', 'v1', credentials=self.credentials)
        return self.service
    
    def send_email(self, to: str, subject: str, body: str, cc: str = None, bcc: str = None, attachments: list = None):
        """
        Send an email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)
            attachments: List of attachment file paths (optional)
            
        Returns:
            Sent message object
        """
        try:
            service = self._get_service()
            
            # Create message
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            
            if cc:
                message['cc'] = cc
            if bcc:
                message['bcc'] = bcc
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send
            result = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"Email sent successfully. Message ID: {result['id']}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise
    
    def create_draft(self, to: str, subject: str, body: str, cc: str = None, bcc: str = None):
        """
        Create a draft email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)
            
        Returns:
            Draft object
        """
        try:
            service = self._get_service()
            
            # Create message
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            
            if cc:
                message['cc'] = cc
            if bcc:
                message['bcc'] = bcc
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Create draft
            draft = service.users().drafts().create(
                userId='me',
                body={'message': {'raw': raw_message}}
            ).execute()
            
            logger.info(f"Draft created successfully. Draft ID: {draft['id']}")
            return draft
            
        except Exception as e:
            logger.error(f"Failed to create draft: {e}")
            raise
    
    def list_messages(self, max_results: int = 10, query: str = None):
        """List messages"""
        try:
            service = self._get_service()
            
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q=query
            ).execute()
            
            return results.get('messages', [])
            
        except Exception as e:
            logger.error(f"Failed to list messages: {e}")
            raise
    
    def get_message(self, message_id: str):
        """Get a specific message"""
        try:
            service = self._get_service()
            
            message = service.users().messages().get(
                userId='me',
                id=message_id
            ).execute()
            
            return message
            
        except Exception as e:
            logger.error(f"Failed to get message: {e}")
            raise
    
    def search_messages(self, query: str, max_results: int = 10):
        """Search messages"""
        return self.list_messages(max_results=max_results, query=query)
    
    def get_unread_messages(self, max_results: int = 10):
        """Get unread messages"""
        return self.list_messages(max_results=max_results, query='is:unread')
    
    def parse_message(self, message):
        """Parse message to extract useful information"""
        headers = message.get('payload', {}).get('headers', [])
        
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        from_email = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
        
        return {
            'id': message['id'],
            'subject': subject,
            'from': from_email,
            'snippet': message.get('snippet', '')
        }
