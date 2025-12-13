"""LLM router for handling different types of requests."""
from typing import Dict, Any, Optional
import logging
from .gemini_client import GeminiClient
from models.schema import ToolAction, ToolType

logger = logging.getLogger(__name__)


class LLMRouter:
    """Routes user requests to appropriate handlers based on LLM analysis."""
    
    def __init__(self, gemini_client: GeminiClient):
        """
        Initialize LLM router.
        
        Args:
            gemini_client: Gemini AI client instance
        """
        self.gemini_client = gemini_client
    
    def analyze_request(self, user_message: str) -> Dict[str, Any]:
        """
        Analyze user request and determine the appropriate action.
        
        Args:
            user_message: User's message
            
        Returns:
            Analysis result with intent and parameters
        """
        intent = self.gemini_client.classify_intent(user_message)
        
        logger.info(f"Classified intent: {intent}")
        
        # Extract parameters based on intent
        parameters = self._extract_parameters(user_message, intent)
        
        return {
            "intent": intent,
            "parameters": parameters,
            "requires_confirmation": self._requires_confirmation(intent)
        }
    
    def _extract_parameters(self, message: str, intent: str) -> Dict[str, Any]:
        """
        Extract parameters from message based on intent.
        
        Args:
            message: User message
            intent: Classified intent
            
        Returns:
            Extracted parameters
        """
        schemas = {
            "send_email": {
                "to": "email address",
                "subject": "email subject",
                "body": "email body content"
            },
            "create_calendar_event": {
                "summary": "event title",
                "start_time": "start date and time",
                "end_time": "end date and time",
                "description": "event description (optional)",
                "location": "event location (optional)"
            },
            "create_document": {
                "title": "document title",
                "content": "document content"
            },
            "send_slack_message": {
                "channel": "channel name or ID",
                "message": "message text"
            },
            "send_sms": {
                "to_number": "phone number",
                "message": "SMS message text"
            }
        }
        
        schema = schemas.get(intent, {})
        
        if not schema:
            return {}
        
        try:
            return self.gemini_client.extract_structured_data(message, schema)
        except Exception as e:
            logger.error(f"Failed to extract parameters: {e}")
            return {}
    
    def _requires_confirmation(self, intent: str) -> bool:
        """
        Determine if an intent requires user confirmation.
        
        Args:
            intent: Intent type
            
        Returns:
            True if confirmation is required
        """
        # Actions that modify external state require confirmation
        confirmation_required = [
            "send_email",
            "create_calendar_event",
            "send_slack_message",
            "send_sms"
        ]
        
        return intent in confirmation_required
    
    def create_tool_action(
        self,
        intent: str,
        parameters: Dict[str, Any]
    ) -> Optional[ToolAction]:
        """
        Create a ToolAction from intent and parameters.
        
        Args:
            intent: Classified intent
            parameters: Extracted parameters
            
        Returns:
            ToolAction object or None if not a tool action
        """
        intent_to_tool = {
            "send_email": (ToolType.GMAIL, "send_email"),
            "create_calendar_event": (ToolType.CALENDAR, "create_event"),
            "create_document": (ToolType.DOCS, "create_document"),
            "send_slack_message": (ToolType.SLACK, "send_message"),
            "send_sms": (ToolType.SMS, "send_sms")
        }
        
        if intent not in intent_to_tool:
            return None
        
        tool_type, action = intent_to_tool[intent]
        
        return ToolAction(
            tool_type=tool_type,
            action=action,
            parameters=parameters,
            requires_confirmation=self._requires_confirmation(intent)
        )
    
    def generate_confirmation_message(
        self,
        tool_action: ToolAction
    ) -> str:
        """
        Generate a confirmation message for a tool action.
        
        Args:
            tool_action: Tool action to confirm
            
        Returns:
            Confirmation message
        """
        templates = {
            ToolType.GMAIL: "I'll send an email to {to} with subject '{subject}'. Should I proceed?",
            ToolType.CALENDAR: "I'll create a calendar event '{summary}' from {start_time} to {end_time}. Should I proceed?",
            ToolType.DOCS: "I'll create a document titled '{title}'. Should I proceed?",
            ToolType.SLACK: "I'll send a message to {channel}. Should I proceed?",
            ToolType.SMS: "I'll send an SMS to {to_number}. Should I proceed?"
        }
        
        template = templates.get(tool_action.tool_type, "Should I proceed with this action?")
        
        try:
            return template.format(**tool_action.parameters)
        except KeyError:
            return "Should I proceed with this action?"
