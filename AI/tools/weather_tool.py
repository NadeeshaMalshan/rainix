import requests
def get_city_weather(city):
    url=  f"http://localhost:5000/api/city/{city}"
    response = requests.get(url)
    data = response.json()
    return data.get("data", {})