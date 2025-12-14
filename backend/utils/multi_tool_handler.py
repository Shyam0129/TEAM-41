"""Multi-tool request handler for executing multiple actions in sequence."""
import logging
from typing import List, Dict, Any
from models.schema import ToolAction, ToolType

logger = logging.getLogger(__name__)


class MultiToolHandler:
    """Handler for requests that require multiple tools."""
    
    def __init__(self, llm_client):
        """
        Initialize multi-tool handler.
        
        Args:
            llm_client: LLM client for analysis
        """
        self.llm_client = llm_client
    
    def analyze_request(self, user_message: str) -> Dict[str, Any]:
        """
        Analyze if request requires multiple tools.
        
        Args:
            user_message: User's message
            
        Returns:
            Dictionary with 'is_multi_tool', 'tasks', and 'summary'
        """
        prompt = f"""Analyze this request and determine if it requires multiple tools/actions:

Request: {user_message}

Available tools:
- send_email: Send emails (requires: to, subject, body)
- create_calendar_event: Schedule meetings/events (requires: summary, start_time, end_time)
- create_document: Generate PDF/Word documents (requires: topic, format)
- send_slack_message: Send messages to Slack channels (requires: channel, message)
- search_messages: Search emails
- list_calendar_events: View calendar

If multiple tools are needed, break down the request into separate tasks in the order they should be executed.

Return JSON in this EXACT format:
{{
    "is_multi_tool": true,
    "tasks": [
        {{
            "tool": "create_document",
            "description": "Generate PDF about Python Interview Questions",
            "parameters": {{
                "topic": "Python Interview Questions",
                "format": "pdf"
            }},
            "order": 1
        }},
        {{
            "tool": "send_email",
            "description": "Send email with PDF to recipient",
            "parameters": {{
                "to": "user@example.com",
                "subject": "Python Interview Questions PDF",
                "body": "Please find attached the Python interview questions document."
            }},
            "order": 2
        }}
    ],
    "summary": "I'll create a PDF about Python Interview Questions and send it via email"
}}

If only ONE tool is needed, return:
{{
    "is_multi_tool": false,
    "tasks": [],
    "summary": ""
}}

Return ONLY the JSON, no other text."""

        try:
            response = self.llm_client.generate_response(prompt, temperature=0.3, max_tokens=1000)
            
            # Parse JSON
            import json
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                result = json.loads(json_str)
                logger.info(f"Multi-tool analysis: {result.get('is_multi_tool', False)}")
                return result
            else:
                return {"is_multi_tool": False, "tasks": [], "summary": ""}
        except Exception as e:
            logger.error(f"Failed to analyze multi-tool request: {e}")
            return {"is_multi_tool": False, "tasks": [], "summary": ""}
    
    def map_tool_to_intent(self, tool_name: str) -> str:
        """
        Map tool name to intent.
        
        Args:
            tool_name: Tool name from analysis
            
        Returns:
            Intent string
        """
        tool_mapping = {
            "send_email": "send_email",
            "create_calendar_event": "create_calendar_event",
            "create_document": "create_document",
            "search_messages": "search_messages",
            "list_calendar_events": "list_calendar_events",
            "read_email": "read_email",
            "create_draft": "create_draft",
            "send_slack_message": "send_slack_message"
        }
        return tool_mapping.get(tool_name, "general_query")
