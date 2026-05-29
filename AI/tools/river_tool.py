import requests
import os

def get_river_alerts(location, is_basin=False):
    try:
        node_api_url = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
        if is_basin:
            riverName = location
            url = f"{node_api_url}/api/rivers/{riverName}"
        else:
            url = f"{node_api_url}/api/rivers/area/{location}"
            
        response = requests.get(url)

        # DEBUG
        print(f"River API Status ({url}):", response.status_code)

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