from utils.datetime_parser import parse_natural_datetime

# Test the parser
result = parse_natural_datetime('tomorrow at 2pm')
print(f"Start: {result['start_time']}")
print(f"End: {result['end_time']}")

result2 = parse_natural_datetime('friday at 3pm for 2 hours')
print(f"\nStart: {result2['start_time']}")
print(f"End: {result2['end_time']}")
