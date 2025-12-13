"""Gmail API integration tool."""
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
import logging
from .google_auth import GoogleAuthHandler

logger = logging.getLogger(__name__)


class GmailTool:
    """Gmail API tool for sending emails and managing drafts."""
    
    def __init__(self, auth_handler: GoogleAuthHandler):
        """
        Initialize Gmail tool.
        
        Args:
            auth_handler: Google authentication handler
        """
        self.auth_handler = auth_handler
        self.service = None
    
    def _get_service(self):
        """Get or create Gmail API service."""
        if not self.service:
            self.service = self.auth_handler.get_service('gmail', 'v1')
        return self.service
    
    def create_message(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create email message.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body content
            cc: CC recipients (comma-separated)
            bcc: BCC recipients (comma-separated)
            
        Returns:
            Email message dictionary
        """
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        if cc:
            message['cc'] = cc
        if bcc:
            message['bcc'] = bcc
        
        msg_body = MIMEText(body, 'plain')
        message.attach(msg_body)
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return {'raw': raw_message}
    
    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body content
            cc: CC recipients (comma-separated)
            bcc: BCC recipients (comma-separated)
            
        Returns:
            Sent message details
        """
        try:
            service = self._get_service()
            message = self.create_message(to, subject, body, cc, bcc)
            
            sent_message = service.users().messages().send(
                userId='me',
                body=message
            ).execute()
            
            logger.info(f"Email sent successfully. Message ID: {sent_message['id']}")
            return sent_message
        
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise
    
    def create_draft(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create an email draft.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body content
            cc: CC recipients (comma-separated)
            bcc: BCC recipients (comma-separated)
            
        Returns:
            Draft details
        """
        try:
            service = self._get_service()
            message = self.create_message(to, subject, body, cc, bcc)
            
            draft = service.users().drafts().create(
                userId='me',
                body={'message': message}
            ).execute()
            
            logger.info(f"Draft created successfully. Draft ID: {draft['id']}")
            return draft
        
        except Exception as e:
            logger.error(f"Failed to create draft: {e}")
            raise
    
    def get_draft(self, draft_id: str) -> Dict[str, Any]:
        """
        Get a draft by ID.
        
        Args:
            draft_id: Draft identifier
            
        Returns:
            Draft details
        """
        try:
            service = self._get_service()
            draft = service.users().drafts().get(
                userId='me',
                id=draft_id
            ).execute()
            
            return draft
        
        except Exception as e:
            logger.error(f"Failed to get draft: {e}")
            raise
    
    def send_draft(self, draft_id: str) -> Dict[str, Any]:
        """
        Send an existing draft.
        
        Args:
            draft_id: Draft identifier
            
        Returns:
            Sent message details
        """
        try:
            service = self._get_service()
            sent_message = service.users().drafts().send(
                userId='me',
                body={'id': draft_id}
            ).execute()
            
            logger.info(f"Draft sent successfully. Message ID: {sent_message['id']}")
            return sent_message
        
        except Exception as e:
            logger.error(f"Failed to send draft: {e}")
            raise
