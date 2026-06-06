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
        json_data = response.json()
        meteo_data = json_data.get("data", {})

        # Fetch PDF contents if available
        advisory = meteo_data.get("severe_weather_advisory", {})
        pdf_texts = {}
        
        for key, pdf_path in advisory.items():
            if key.endswith("_pdf") and pdf_path:
                try:
                    pdf_url = f"{node_api_url}/api/meteo/pdf?path={pdf_path}"
                    pdf_res = requests.get(pdf_url)
                    if pdf_res.status_code == 200:
                        pdf_json = pdf_res.json()
                        if pdf_json.get("success"):
                            pdf_texts[key] = pdf_json.get("text")
                except Exception as pdf_e:
                    print(f"Error fetching PDF {pdf_path}: {pdf_e}")

        if pdf_texts:
            meteo_data["parsed_pdf_alerts"] = pdf_texts

        return meteo_data

    except Exception as e:

        return {
            "error": str(e)
    }