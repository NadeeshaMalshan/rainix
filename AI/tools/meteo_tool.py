import os
import requests

def get_meteo_alerts():
    try:
        node_api_url = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
        url = f"{node_api_url}/api/meteo"
        response = requests.get(url)

        # DEBUG
        print(f"Meteo API Status ({url}):", response.status_code)

        # if backend failed
        if response.status_code != 200:

            return {
                "error":
                f"Meteo API failed with status {response.status_code}"
            }

        # safely parse JSON
        data = response.json()

        return data.get("data", {})

    except Exception as e:

        return {
            "error": str(e)
    }