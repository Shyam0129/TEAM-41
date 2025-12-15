"""Simple datetime parser for natural language dates."""
from datetime import datetime, timedelta
import re
from typing import Dict


def parse_natural_datetime(text: str) -> Dict[str, datetime]:
    """
    Parse natural language datetime expressions.
    
    Args:
        text: Natural language expression like "tomorrow at 2pm"
        
    Returns:
        Dictionary with 'start_time' and 'end_time' as datetime objects
    """
    now = datetime.now()
    text_lower = text.lower().strip()
    
    # Default duration: 1 hour
    duration = timedelta(hours=1)
    
    # Parse relative days
    if "tomorrow" in text_lower:
        base_date = now + timedelta(days=1)
    elif "today" in text_lower:
        base_date = now
    elif "next week" in text_lower:
        base_date = now + timedelta(weeks=1)
    elif "next month" in text_lower:
        base_date = now + timedelta(days=30)
    elif "monday" in text_lower:
        days_ahead = 0 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "tuesday" in text_lower:
        days_ahead = 1 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "wednesday" in text_lower:
        days_ahead = 2 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "thursday" in text_lower:
        days_ahead = 3 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "friday" in text_lower:
        days_ahead = 4 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "saturday" in text_lower:
        days_ahead = 5 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    elif "sunday" in text_lower:
        days_ahead = 6 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        base_date = now + timedelta(days=days_ahead)
    else:
        base_date = now
    
    # Parse time
    hour = 14  # Default 2pm
    minute = 0
    
    # Look for time patterns
    # Pattern: "2pm", "14:00", "2:30pm", etc.
    time_pattern = r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?'
    match = re.search(time_pattern, text_lower)
    
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2)) if match.group(2) else 0
        am_pm = match.group(3)
        
        if am_pm == 'pm' and hour < 12:
            hour += 12
        elif am_pm == 'am' and hour == 12:
            hour = 0
    
    # Set the time
    start_time = base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # Look for duration
    duration_pattern = r'for\s+(\d+)\s*(hour|hr|minute|min)'
    duration_match = re.search(duration_pattern, text_lower)
    
    if duration_match:
        amount = int(duration_match.group(1))
        unit = duration_match.group(2)
        
        if 'hour' in unit or unit == 'hr':
            duration = timedelta(hours=amount)
        elif 'minute' in unit or unit == 'min':
            duration = timedelta(minutes=amount)
    
    end_time = start_time + duration
    
    return {
        "start_time": start_time,
        "end_time": end_time
    }
