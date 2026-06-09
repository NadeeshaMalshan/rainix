import requests
import os
from cachetools import cached, TTLCache

@cached(cache=TTLCache(maxsize=100, ttl=600))
def get_river_alerts(location, is_basin=False):
    try:
        node_api_url = os.getenv("NODE_API_URL", "http://localhost:5000").rstrip("/")
        if is_basin:
            riverName = location
            url = f"{node_api_url}/api/rivers/{riverName}?full=true"
        else:
            url = f"{node_api_url}/api/rivers/area/{location}?full=true"
            
        response = requests.get(url)

        # DEBUG
        print(f"River API Status ({url}):", response.status_code)

        # if backend failed
        if response.status_code != 200:

            return {
                "error":
                f"River API failed with status {response.status_code}"
            }

        data = response.json()
        rivers = data.get("data", [])

        # Inject ML predictions for LLM context if it's Kalu Ganga Ratnapura
        for river in rivers:
            river_name = river.get("name", "").lower()
            original_name = river.get("originalName", "").lower()
            if "ratnapura" in river_name or "ratnapura" in original_name:
                historical_data = river.get("historicalData", [])
                if historical_data:
                    try:
                        pred_res = requests.post(
                            "http://127.0.0.1:8000/api/predict/river",
                            json={"river_name": "Kalu Ganga - Ratnapura", "historical_data": historical_data},
                            timeout=3
                        )
                        if pred_res.status_code == 200:
                            ml_data = pred_res.json()
                            if ml_data.get("predicted_level") is not None:
                                river["ml_prediction_30min_ahead"] = f"~{ml_data['predicted_level']}m"
                                river["ai_instruction"] = "CRITICAL: The user wants to know the prediction. You MUST use ml_prediction_30min_ahead value in your response as the exact 30-min prediction."
                    except Exception as pred_err:
                        print("ML Pred Error in tool:", pred_err)
                        pass
                
            # Remove large historical data so we don't blow up the LLM context limits
            river.pop("historicalData", None)
            river.pop("chart", None)

        return rivers

    except Exception as e:

        return {
            "error": str(e)
    }