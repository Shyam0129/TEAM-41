"""
Calendar Tool V2 - Uses Google OAuth credentials directly (multi-user).
"""

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class CalendarToolV2:
    """Calendar tool that uses Google OAuth credentials directly"""
    
    def __init__(self, credentials: Credentials):
        """Initialize Calendar tool with Google credentials"""
        self.credentials = credentials
        self.service = None
    
    def _get_service(self):
        """Get or create Calendar API service"""
        if not self.service:
            self.service = build('calendar', 'v3', credentials=self.credentials)
        return self.service
    
    def create_event(self, summary: str, start_time: datetime, end_time: datetime,
                    description: str = None, location: str = None, attendees: list = None):
        """Create a calendar event"""
        try:
            service = self._get_service()
            
            event = {
                'summary': summary,
                'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
            }
            
            if description:
                event['description'] = description
            if location:
                event['location'] = location
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            result = service.events().insert(calendarId='primary', body=event).execute()
            logger.info(f"Event created: {result.get('id')}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            raise
    
    def get_events_today(self):
        """Get today's events"""
        try:
            service = self._get_service()
            
            now = datetime.utcnow()
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=start_of_day.isoformat() + 'Z',
                timeMax=end_of_day.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except Exception as e:
            logger.error(f"Failed to get today's events: {e}")
            raise
    
    def get_events_this_week(self):
        """Get this week's events"""
        try:
            service = self._get_service()
            
            now = datetime.utcnow()
            end_of_week = now + timedelta(days=7)
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now.isoformat() + 'Z',
                timeMax=end_of_week.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except Exception as e:
            logger.error(f"Failed to get week's events: {e}")
            raise
    
    def search_events(self, start_date: datetime = None, end_date: datetime = None,
                     query: str = None, max_results: int = 10):
        """Search for events"""
        try:
            service = self._get_service()
            
            params = {
                'calendarId': 'primary',
                'maxResults': max_results,
                'singleEvents': True,
                'orderBy': 'startTime'
            }
            
            if start_date:
                params['timeMin'] = start_date.isoformat() + 'Z'
            if end_date:
                params['timeMax'] = end_date.isoformat() + 'Z'
            if query:
                params['q'] = query
            
            events_result = service.events().list(**params).execute()
            return events_result.get('items', [])
            
        except Exception as e:
            logger.error(f"Failed to search events: {e}")
            raise
    
    def update_event(self, event_id: str, summary: str = None, start_time: datetime = None,
                    end_time: datetime = None, description: str = None, location: str = None):
        """Update an event"""
        try:
            service = self._get_service()
            
            event = service.events().get(calendarId='primary', eventId=event_id).execute()
            
            if summary:
                event['summary'] = summary
            if start_time:
                event['start'] = {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'}
            if end_time:
                event['end'] = {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'}
            if description:
                event['description'] = description
            if location:
                event['location'] = location
            
            updated_event = service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Event updated: {event_id}")
            return updated_event
            
        except Exception as e:
            logger.error(f"Failed to update event: {e}")
            raise
    
    def delete_event(self, event_id: str):
        """Delete an event"""
        try:
            service = self._get_service()
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            logger.info(f"Event deleted: {event_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete event: {e}")
            raise
