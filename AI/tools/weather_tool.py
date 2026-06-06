import requests
import os
from cachetools import cached, TTLCache

@cached(cache=TTLCache(maxsize=100, ttl=600))
def get_city_weather(city):
    try:
        node_api_url = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
        city_clean = city.strip()
        url = f"{node_api_url}/api/city/{city_clean}"
        
        response = requests.get(url, timeout=10)
        
        # DEBUG
        print("Weather API Status:", response.status_code)
        
        if response.status_code != 200:
            return {
                "error": f"Weather API failed with status {response.status_code}"
            }
            
        data = response.json()
        return data.get("data", {})
    except Exception as e:
        print("Error fetching weather in tool:", e)
        return {
            "error": str(e)
        }