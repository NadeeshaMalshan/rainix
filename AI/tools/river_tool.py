import requests
import os
def get_river_alerts(city):
    
    try:
        node_api_url = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
        url = (f"{node_api_url}/api/rivers/{city}")
        response = requests.get(url)

        # DEBUG
        print("River API Status:", response.status_code)

        # if backend failed
        if response.status_code != 200:

            return {
                "error":
                f"River API failed with status {response.status_code}"
            }

        # safely parse JSON
        data = response.json()

        return data.get("data", [])

    except Exception as e:

        return {
            "error": str(e)
    }