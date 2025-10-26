import requests
import json
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# --- Prompt Configuration ---

# 1. The detailed system prompt you generated
SYSTEM_PROMPT = """
You are an autonomous AI agent that functions as an expert travel planner. Your sole task is to generate a detailed, structured itinerary based on user-provided parameters.

CRITICAL INSTRUCTIONS:
1.  You MUST respond with ONLY a valid JSON object.
2.  Do NOT under any circumstances include introductory text, explanations, apologies, or markdown formatting like ```json. Your entire response must be the raw JSON object and nothing else.
3.  The generated JSON MUST strictly adhere to the `Itinerary` and `ItineraryEvent` schemas provided below.
4.  All `id` fields (for the main itinerary and all events) must be unique strings.
5.  Event `type` MUST be one of the following exact strings: "flight", "accommodation", "food", "entertainment", "transit", "activity".
6.  `coordinates` MUST be an array of two numbers: [latitude, longitude].
7.  Generate a logical and sequential list of events for the specified date range.

---
JSON Schema Definition

Top-level `Itinerary` object:
{
  "id": "string",
  "location": "string",
  "startDate": "string",
  "endDate": "string",
  "events": "ItineraryEvent[]"
}

`ItineraryEvent` object (for the `events` array):
{
  "id": "string",
  "title": "string",
  "type": "string",
  "time": "string",
  "location": "string",
  "description": "string",
  "duration": "string",
  "coordinates": "[number, number]"
}
---

Example of Perfect Execution (One-Shot Example)

When you receive this input:
`{ "location": "Paris, France", "startDate": "2025-12-20", "endDate": "2025-12-27" }`

Your EXACT and ONLY response must be this JSON:
{
"id": "itinerary-1700000000000",
"location": "Paris, France",
"startDate": "2025-12-20",
"endDate": "2025-12-27",
"events": [
{
"id": "event-1",
"title": "Arrival at Charles de Gaulle Airport",
"type": "flight",
"time": "10:30 AM",
"location": "CDG Airport, Paris",
"description": "Land at Charles de Gaulle Airport. Collect baggage and go through customs.",
"duration": "2h",
"coordinates": [49.0097, 2.5479]
}
]
}
"""

def generate_itinerary(location, start_date, end_date):
    """
    Generate an itinerary using the ASI API.
    
    Args:
        location (str): The destination location
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
    
    Returns:
        dict: The itinerary data as a Python dictionary
    """
    # Get your key from environment variables
    API_KEY = os.environ.get("ASI_API_KEY")
    if not API_KEY:
        raise RuntimeError("Missing ASI_API_KEY in environment. Please set ASI_API_KEY in your environment or .env file.")

    # Use the plain URL
    API_URL = "https://api.asi1.ai/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    # Create the user request payload
    user_request_payload = json.dumps({
        "location": location,
        "startDate": start_date,
        "endDate": end_date
    })

    # Assemble the final payload
    data = {
        "model": "asi1-mini",
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": user_request_payload
            }
        ]
    }

    try:
        response = requests.post(API_URL, headers=headers, data=json.dumps(data))
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract the raw text content from the response
            raw_json_output = result['choices'][0]['message']['content']
            
            # Parse the raw text into a Python dictionary
            itinerary_data = json.loads(raw_json_output)
            return itinerary_data

        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")

    except requests.exceptions.RequestException as e:
        raise Exception(f"Request failed: {e}")
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to decode JSON response: {e}")


# If this script is run directly, use command-line arguments
if __name__ == "__main__":
    if len(sys.argv) == 4:
        # Called with arguments: python promotfile.py "Paris, France" "2025-12-20" "2025-12-22"
        location = sys.argv[1]
        start_date = sys.argv[2]
        end_date = sys.argv[3]
    else:
        # Default values for testing
        location = "Paris, France"
        start_date = "2025-12-20"
        end_date = "2025-12-22"

    print(f"Generating itinerary for {location} from {start_date} to {end_date}...", file=sys.stderr)
    
    try:
        itinerary_data = generate_itinerary(location, start_date, end_date)
        # Output only the JSON to stdout (for easy consumption by the server)
        print(json.dumps(itinerary_data))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
