"""Google Calendar API integration tool."""
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging
from .google_auth import GoogleAuthHandler

logger = logging.getLogger(__name__)


class CalendarTool:
    """Google Calendar API tool for event management."""
    
    def __init__(self, auth_handler: GoogleAuthHandler):
        """
        Initialize Calendar tool.
        
        Args:
            auth_handler: Google authentication handler
        """
        self.auth_handler = auth_handler
        self.service = None
    
    def _get_service(self):
        """Get or create Calendar API service."""
        if not self.service:
            self.service = self.auth_handler.get_service('calendar', 'v3')
        return self.service
    
    def create_event(
        self,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """
        Create a calendar event.
        
        Args:
            summary: Event title
            start_time: Event start time
            end_time: Event end time
            description: Event description
            location: Event location
            attendees: List of attendee email addresses
            timezone: Event timezone
            
        Returns:
            Created event details
        """
        try:
            service = self._get_service()
            
            event = {
                'summary': summary,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': timezone,
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': timezone,
                },
            }
            
            if description:
                event['description'] = description
            
            if location:
                event['location'] = location
            
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            created_event = service.events().insert(
                calendarId='primary',
                body=event
            ).execute()
            
            logger.info(f"Event created successfully. Event ID: {created_event['id']}")
            return created_event
        
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            raise
    
    def get_event(self, event_id: str) -> Dict[str, Any]:
        """
        Get event by ID.
        
        Args:
            event_id: Event identifier
            
        Returns:
            Event details
        """
        try:
            service = self._get_service()
            event = service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            return event
        
        except Exception as e:
            logger.error(f"Failed to get event: {e}")
            raise
    
    def list_upcoming_events(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        List upcoming events.
        
        Args:
            max_results: Maximum number of events to return
            
        Returns:
            List of upcoming events
        """
        try:
            service = self._get_service()
            now = datetime.utcnow().isoformat() + 'Z'
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            logger.info(f"Retrieved {len(events)} upcoming events")
            return events
        
        except Exception as e:
            logger.error(f"Failed to list events: {e}")
            raise
    
    def update_event(
        self,
        event_id: str,
        summary: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        description: Optional[str] = None,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing event.
        
        Args:
            event_id: Event identifier
            summary: New event title
            start_time: New start time
            end_time: New end time
            description: New description
            location: New location
            
        Returns:
            Updated event details
        """
        try:
            service = self._get_service()
            event = service.events().get(calendarId='primary', eventId=event_id).execute()
            
            if summary:
                event['summary'] = summary
            if start_time:
                event['start']['dateTime'] = start_time.isoformat()
            if end_time:
                event['end']['dateTime'] = end_time.isoformat()
            if description:
                event['description'] = description
            if location:
                event['location'] = location
            
            updated_event = service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Event updated successfully. Event ID: {event_id}")
            return updated_event
        
        except Exception as e:
            logger.error(f"Failed to update event: {e}")
            raise
    
    def delete_event(self, event_id: str) -> None:
        """
        Delete an event.
        
        Args:
            event_id: Event identifier
        """
        try:
            service = self._get_service()
            service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            logger.info(f"Event deleted successfully. Event ID: {event_id}")
        
        except Exception as e:
            logger.error(f"Failed to delete event: {e}")
            raise
