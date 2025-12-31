"""Groq AI client for LLM interactions."""
from groq import Groq
from typing import Optional, Dict, Any, List
import logging
import json
from .system_prompts import get_system_prompt, get_intent_prompt, get_email_prompt, get_document_prompt

logger = logging.getLogger(__name__)


class GroqClient:
    """Client for interacting with Groq AI."""
    
    def __init__(self, api_key: str, model_name: str = "llama-3.3-70b-versatile"):
        """
        Initialize Groq client.
        
        Args:
            api_key: Groq API key
            model_name: Model name to use (default: llama-3.3-70b-versatile)
        """
        self.client = Groq(api_key=api_key)
        self.model_name = model_name
        self.chat_history = []
    
    def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate a response from a prompt.
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated response text
        """
        try:
            messages = [{"role": "user", "content": prompt}]
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens or 1024
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            raise
    
    def start_chat(self, history: Optional[List[Dict[str, str]]] = None):
        """
        Start a chat session with system prompt.
        
        Args:
            history: Optional chat history
        """
        # Initialize with system prompt
        system_message = {"role": "system", "content": get_system_prompt()}
        self.chat_history = [system_message]
        
        # Add any existing history
        if history:
            self.chat_history.extend(history)
        
        return self
    
    def send_message(self, message: str, temperature: float = 0.7) -> str:
        """
        Send a message in the chat session.
        
        Args:
            message: User message
            temperature: Sampling temperature
            
        Returns:
            AI response
        """
        try:
            # Add user message to history
            self.chat_history.append({"role": "user", "content": message})
            
            # Get response
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=self.chat_history,
                temperature=temperature
            )
            
            ai_message = response.choices[0].message.content
            
            # Add AI response to history
            self.chat_history.append({"role": "assistant", "content": ai_message})
            
            return ai_message
            
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise
    
    def extract_structured_data(
        self,
        prompt: str,
        schema: Dict[str, Any],
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Extract structured data from a prompt.
        
        Args:
            prompt: Input prompt
            schema: Expected data schema
            temperature: Sampling temperature
            
        Returns:
            Extracted structured data
        """
        try:
            schema_str = json.dumps(schema, indent=2)
            full_prompt = f"""Extract the following information from the text and return it as JSON.

Schema:
{schema_str}

Text: {prompt}

Return ONLY valid JSON, no other text."""

            response = self.generate_response(full_prompt, temperature=temperature)
            
            # Try to parse JSON from response
            try:
                # Find JSON in response
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    return json.loads(json_str)
                else:
                    return json.loads(response)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from response: {response}")
                return {}
                
        except Exception as e:
            logger.error(f"Failed to extract structured data: {e}")
            return {}
    
    def classify_intent(self, user_message: str) -> str:
        """
        Classify user intent from message.
        
        Args:
            user_message: User's message
            
        Returns:
            Classified intent
        """
        try:
            # Use centralized prompt
            prompt = get_intent_prompt(user_message)
            
            response = self.generate_response(prompt, temperature=0.1)
            intent = response.strip().lower()
            
            # Validate intent
            valid_intents = [
                "send_email", "read_email", "search_email", "get_unread_emails", "reply_to_email",
                "create_calendar_event", "list_calendar_events", "search_calendar_events",
                "update_calendar_event", "delete_calendar_event", "get_today_events", "get_week_events",
                "create_document", "send_slack_message", "send_sms", "general_query"
            ]
            
            if intent in valid_intents:
                return intent
            else:
                logger.warning(f"Invalid intent classified: {intent}, defaulting to general_query")
                return "general_query"
                
        except Exception as e:
            logger.error(f"Failed to classify intent: {e}")
            return "general_query"
    
    def generate_email(
        self,
        recipient: str,
        purpose: str,
        context: Optional[str] = None,
        tone: str = "professional"
    ) -> Dict[str, str]:
        """
        Generate a brief, professional email with subject and body.
        
        Args:
            recipient: Email recipient (name or email)
            purpose: Purpose of the email
            context: Additional context for the email
            tone: Email tone (professional, casual, formal)
            
        Returns:
            Dictionary with 'subject' and 'body' keys
        """
        try:
            # Use centralized prompt
            prompt = get_email_prompt(recipient, purpose, context or "", tone)
            
            response = self.generate_response(prompt, temperature=0.7)
            
            # Parse JSON response
            try:
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    email_data = json.loads(json_str)
                    return {
                        "subject": email_data.get("subject", "No Subject"),
                        "body": email_data.get("body", "")
                    }
                else:
                    logger.error("No JSON found in email generation response")
                    return {
                        "subject": "No Subject",
                        "body": purpose
                    }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse email JSON: {e}")
                return {
                    "subject": "No Subject",
                    "body": purpose
                }
                
        except Exception as e:
            logger.error(f"Failed to generate email: {e}")
            return {
                "subject": "No Subject",
                "body": purpose
            }
    
    def parse_datetime(
        self,
        text: str,
        reference_time: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Parse natural language date/time into structured format.
        
        Args:
            text: Natural language date/time (e.g., "tomorrow at 2pm", "next Monday 10am")
            reference_time: Reference datetime for relative dates (ISO format)
            
        Returns:
            Dictionary with 'start_time' and 'end_time' in ISO format
        """
        try:
            from datetime import datetime, timedelta
            import re
            
            now = datetime.now() if not reference_time else datetime.fromisoformat(reference_time)
            
            prompt = f"""Parse the following date/time expression into a structured format.

Current date/time: {now.strftime('%Y-%m-%d %H:%M:%S')}
Expression: {text}

Rules:
1. If only start time is mentioned, assume 1 hour duration
2. Handle relative dates (tomorrow, next week, etc.)
3. Handle time formats (2pm, 14:00, etc.)
4. Return times in ISO 8601 format

Return ONLY this JSON format:
{{
    "start_time": "YYYY-MM-DDTHH:MM:SS",
    "end_time": "YYYY-MM-DDTHH:MM:SS"
}}

Return ONLY the JSON, no other text."""

            response = self.generate_response(prompt, temperature=0.3)
            
            # Parse JSON response
            try:
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    datetime_data = json.loads(json_str)
                    return {
                        "start_time": datetime_data.get("start_time", ""),
                        "end_time": datetime_data.get("end_time", "")
                    }
                else:
                    # Fallback: default to 1 hour from now
                    start_time = now + timedelta(hours=1)
                    end_time = start_time + timedelta(hours=1)
                    return {
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat()
                    }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse datetime JSON: {e}")
                # Fallback
                start_time = now + timedelta(hours=1)
                end_time = start_time + timedelta(hours=1)
                return {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to parse datetime: {e}")
            from datetime import datetime, timedelta
            now = datetime.now()
            start_time = now + timedelta(hours=1)
            end_time = start_time + timedelta(hours=1)
            return {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
    
    def generate_document_content(
        self,
        topic: str,
        document_type: str = "general",
        length: str = "detailed"
    ) -> Dict[str, str]:
        """
        Generate detailed, well-structured content for a document.
        
        Args:
            topic: Topic or subject of the document
            document_type: Type of document (report, guide, article, etc.)
            length: Length preference (brief, detailed, comprehensive)
            
        Returns:
            Dictionary with 'title' and 'content' keys
        """
        try:
            # Use centralized prompt
            prompt = get_document_prompt(topic, document_type, length)
            
            response = self.generate_response(prompt, temperature=0.7, max_tokens=4000)
            
            # Parse JSON response
            try:
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > start:
                    json_str = response[start:end]
                    doc_data = json.loads(json_str)
                    return {
                        "title": doc_data.get("title", topic),
                        "content": doc_data.get("content", "")
                    }
                else:
                    logger.error("No JSON found in document generation response")
                    return {
                        "title": topic,
                        "content": response
                    }
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse document JSON: {e}")
                return {
                    "title": topic,
                    "content": response
                }
                
        except Exception as e:
            logger.error(f"Failed to generate document content: {e}")
            return {
                "title": topic,
                "content": f"Failed to generate content for: {topic}"
            }
