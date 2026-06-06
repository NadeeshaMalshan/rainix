from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from tools.meteo_tool import get_meteo_alerts
from langchain_google_genai import (ChatGoogleGenerativeAI)
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import (create_react_agent)
from langgraph.checkpoint.memory import MemorySaver
from tools.weather_tool import (get_city_weather)
from tools.river_tool import (get_river_alerts)
from tools.meteo_tool import (get_meteo_alerts)
from tools.location_tool import (find_rivers, CITY_RIVERES, get_relative_position)
import asyncio
import json
import re
import os


load_dotenv()
app = FastAPI()

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GOOGLE_API_KEYS = {
    "A": os.getenv("GOOGLE_API_KEY_A", ""),
    "B": os.getenv("GOOGLE_API_KEY_B", ""),
    "C": os.getenv("GOOGLE_API_KEY_C", ""),
    "D": os.getenv("GOOGLE_API_KEY_D", ""),
    "E": os.getenv("GOOGLE_API_KEY_E", ""),
}


MODEL_CONFIGS = [
    {"name": "pro",     "model": "gemini-3.1-pro",      "label": "Gemini 3.1 Pro"},
    {"name": "google",  "model": "gemini-3.5-flash",    "label": "Gemini 3.5 Flash"},
    {"name": "gem3",    "model": "gemini-3.1-flash-lite","label": "Gemini 3.1 Lite"},
    {"name": "gemma",   "model": "gemma-4-31b-it",      "label": "Gemma 4 (31B)"},
]

def _create_llm(model_name: str, api_key: str):
    """Create a ChatGoogleGenerativeAI instance with a specific API key."""
    return ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.2,
        streaming=True,
        google_api_key=api_key
    )

# Build LLMs: key_llms[key_label][model_name] = LLM instance
key_llms = {}
for key_label, api_key in GOOGLE_API_KEYS.items():
    if api_key and api_key not in ("", "YOUR_SECOND_GOOGLE_API_KEY", "YOUR_THIRD_GOOGLE_API_KEY"):
        key_llms[key_label] = {}
        for cfg in MODEL_CONFIGS:
            key_llms[key_label][cfg["name"]] = _create_llm(cfg["model"], api_key)

# Only Google models are used now.

@tool
def weather_tool(city: str):

    """
    Get weather and flood data
    for a city.
    """

    return get_city_weather(city)


@tool
def river_tool(location: str, is_basin: bool = False):
    """
    Get river alert data for a location.
    Set is_basin to True if querying an entire river basin.
    Set is_basin to False if querying a specific city or area.
    """
    return get_river_alerts(location, is_basin)



@tool
def location_tool(city: str):

    """
    Find rivers near a city using geographic information or maps.
    """

    return find_rivers(city)

@tool
def meteo_tool():
    """
    Get official severe weather advisories, public weather forecasts, and marine/shipping forecasts from the Sri Lanka Department of Meteorology.
    Call this when users ask for official warnings, severe weather, or marine/shipping forecasts.
    """
    return get_meteo_alerts()


memory = MemorySaver()

agent_prompt = (
    "You are rainiX AI, a highly efficient real-time weather and flood safety assistant.\n\n"
    "CRITICAL TOOL SELECTION RULES (To save tokens, follow exactly):\n"
    "1. WEATHER ONLY: If asked ONLY about weather, rain, or weather predictions, call `weather_tool` and return ONLY weather information.\n"
    "2. RIVER ONLY: If asked ONLY about river levels, call `river_tool` and return ONLY river data.\n"
    "3. FLOODS: If asked about FLOODS or flood risks, call BOTH `river_tool` and `weather_tool`. Compare historical river trends with the weather forecast to provide a calculated flood prediction.\n"
    "4. DISASTERS/ADVISORIES: If asked about disasters, warnings, or advisories, call `meteo_tool` ONLY to return official alerts. BUT if a disaster prediction is also requested, call `weather_tool` to compare with recent/forecast weather data.\n"
    "5. CITY STATUS: If asked for the general status of a city, you MUST call ALL THREE tools: `weather_tool`, `river_tool` (for nearby river stations, or you can get by latitude/longitude), and `meteo_tool`. Synthesize all three into a single cohesive report.\n"
    "6. FUTURE PREDICTIONS : If the user asks to predict future weather, river levels, or disasters, you MUST deeply analyze past weather patterns, historical river trends, and past meteo data. Combine these historical datasets with current forecasts to mathematically calculate and provide a highly accurate prediction.\n\n"
    "FORMATTING & SAFETY RULES:\n"
    "- Token Optimization: Be extremely concise. Do not waste tokens on unnecessary fluff.\n"
    "- If `river_tool` returns multiple stations, list the current level, thresholds, and status for ALL of them.\n"
    "- Even if replying in Sinhala, include the exact English name of the river in your final output so the UI can display telemetry cards.\n"
    "- If a tool returns null/empty, just state the data is unavailable and proceed.\n\n"
    "OUTPUT FORMAT (You MUST include both <thinking> and <final> blocks):\n"
    "<thinking>\n"
    "Briefly explain which condition applies and what tools you are choosing. Keep it short to save tokens.\n"
    "</thinking>\n"
    "<final>\n"
    "Write the concise, user-facing answer here.\n"
    "</final>\n"
)


_THINKING_RE = re.compile(r"<thinking>(.*?)</thinking>", re.DOTALL | re.IGNORECASE)
_THOUGHT_RE = re.compile(r"<thought>(.*?)</thought>", re.DOTALL | re.IGNORECASE)
_FINAL_RE = re.compile(r"<final>(.*?)</final>", re.DOTALL | re.IGNORECASE)


def _extract_thinking_final(text: str):
    if not isinstance(text, str):
        return "", ""

    thinking = ""
    t_match = _THINKING_RE.search(text)
    if t_match:
        thinking = t_match.group(1).strip()

    final = ""
    lower = text.lower()
    f_start = lower.find("<final>")
    
    if f_start != -1:
        f_content = text[f_start + len("<final>"):].strip()
        f_end = f_content.lower().find("</final>")
        if f_end != -1:
            final = f_content[:f_end].strip()
        else:
            final = f_content
    else:
        if t_match:
            end_thinking = t_match.end()
            final = text[end_thinking:].strip()
        else:
            final = text.strip()

    return thinking, final


def _extract_partials(buffer: str):
    if not isinstance(buffer, str) or not buffer:
        return "", ""

    lower = buffer.lower()

    thinking = ""
    t_start = lower.find("<thinking>")
    t_end = lower.find("</thinking>")

    if t_start != -1:
        start = t_start + len("<thinking>")
        end = t_end if t_end != -1 else len(buffer)
        thinking = buffer[start:end].strip()

    final = ""
    f_start = lower.find("<final>")
    f_end = lower.find("</final>")

    if f_start != -1:
        start = f_start + len("<final>")
        end = f_end if f_end != -1 else len(buffer)
        final = buffer[start:end].strip()

    return thinking, final


# ──────────────────────────────────────────────────────────────────────
# Build agents for each (key, model) combination
# agents_by_key[key_label][model_name] = agent
# ──────────────────────────────────────────────────────────────────────
tools_list = [weather_tool, river_tool, location_tool, meteo_tool]

agents_by_key = {}
for key_label, llms in key_llms.items():
    agents_by_key[key_label] = {}
    for model_name, llm in llms.items():
        agents_by_key[key_label][model_name] = create_react_agent(
            llm,
            tools=tools_list,
            prompt=agent_prompt,
            checkpointer=memory
        )

# Only Google agents are used now.


def _build_fallback_order(provider: str):
    """
    Build the full fallback chain for Google models.
    """
    available_keys = sorted(agents_by_key.keys())  # ["A", "B", "C"]
    model_names = [cfg["name"] for cfg in MODEL_CONFIGS]  # ["google", "gem3", "gemma"]

    # Determine model priority order based on provider selection
    if provider in model_names:
        # Put the selected model first, then the others
        ordered_models = [provider] + [m for m in model_names if m != provider]
    else:
        # "auto" or unknown → default order
        ordered_models = model_names

    chain = []
    for m in ordered_models:
        for k in available_keys:
            if m in agents_by_key.get(k, {}):
                chain.append((k, m))
    return chain


def _get_agent(key_label: str, model_name: str):
    """Get the agent for a given key+model combo."""
    return agents_by_key[key_label][model_name]


def _get_provider_display(key_label: str, model_name: str):
    """Get a human-readable provider name for the response."""
    # Return model name with key suffix for transparency
    return f"{model_name} (Key {key_label})"


@app.get("/chat")
def chat(q: str, session_id: str = "default", provider: str = "google"):

    # Pass the thread_id to identify the unique user session memory
    config = {"configurable": {"thread_id": session_id}}

    fallback_order = _build_fallback_order(provider)

    errors = {}
    for key_label, model_name in fallback_order:
        prov_display = _get_provider_display(key_label, model_name)
        try:
            active_agent = _get_agent(key_label, model_name)
            response = active_agent.invoke({
                "messages": [
                    ("user", q)
                ]
            }, config=config)
            final_message = response["messages"][-1].content
            thinking, final = _extract_thinking_final(final_message)
            return {
                "response": [thinking, final],
                "provider": prov_display,
                "switched": (key_label, model_name) != fallback_order[0]
            }
        except Exception as e:
            err_str = str(e)
            print(f"Error invoking model '{prov_display}': {err_str}")
            errors[prov_display] = err_str

    # If all models fail, return a complete diagnostic
    diagnostic = "I'm sorry, I encountered an issue connecting to all available AI model providers. Here is a detailed diagnostic:\n\n"
    
    for prov_display, err in errors.items():
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            diagnostic += f"* **{prov_display}**: Quota limit exceeded (429 RESOURCE_EXHAUSTED).\n"
        elif "API_KEY" in err or "invalid" in err.lower():
            diagnostic += f"* **{prov_display}**: Invalid/unconfigured API key.\n"
        elif "insufficient_quota" in err or "quota" in err.lower():
            diagnostic += f"* **{prov_display}**: Insufficient account balance or quota.\n"
        elif "rate_limit" in err.lower():
            diagnostic += f"* **{prov_display}**: Rate limit exceeded.\n"
        else:
            diagnostic += f"* **{prov_display}**: Issue ({err[:80]}...)\n"

    diagnostic += "\n*Please review your API key balances and settings, or wait a minute before retrying.*"
    return {
        "response": diagnostic,
        "provider": "failed"
    }


@app.get("/chat/stream")
async def chat_stream(q: str, session_id: str = "default", provider: str = "google"):
    config = {"configurable": {"thread_id": session_id}}

    fallback_order = _build_fallback_order(provider)

    async def event_gen():
        errors = {}
        for key_label, model_name in fallback_order:
            prov_display = _get_provider_display(key_label, model_name)
            try:
                active_agent = _get_agent(key_label, model_name)

                buffer = ""
                last_thinking = ""
                last_final = ""

                yield "event: meta\ndata: " + json.dumps({"provider": prov_display}) + "\n\n"

                async for ev in active_agent.astream_events(
                    {"messages": [("user", q)]},
                    config=config,
                    version="v1",
                ):
                    if ev.get("event") == "on_chat_model_stream":
                        chunk = ev.get("data", {}).get("chunk")
                        token = ""
                        if chunk is not None:
                            token = getattr(chunk, "content", "") or ""
                        if token:
                            buffer += token
                            thinking, final = _extract_partials(buffer)
                            if thinking != last_thinking:
                                last_thinking = thinking
                                yield "event: thinking\ndata: " + json.dumps({"content": last_thinking}) + "\n\n"
                            if final != last_final:
                                last_final = final
                                yield "event: final_partial\ndata: " + json.dumps({"content": last_final}) + "\n\n"
                    
                    elif ev.get("event") == "on_tool_start":
                        name = ev.get("name") or "tool"
                        
                        # Extract exact location from tool inputs for the frontend
                        input_data = ev.get("data", {}).get("input", {})
                        loc = input_data.get("location") or input_data.get("region") or input_data.get("city")
                        is_basin = input_data.get("is_basin", False)
                        if loc and isinstance(loc, str):
                            yield "event: detected_location\ndata: " + json.dumps({"location": loc, "is_basin": is_basin}) + "\n\n"
                            
                        if name == "weather_tool":
                            display_name = "Connecting to weather services..."
                            yield "event: detected_intent\ndata: " + json.dumps({"intent": "weather"}) + "\n\n"
                        elif name == "river_tool":
                            display_name = "Fetching river telemetry..."
                            yield "event: detected_intent\ndata: " + json.dumps({"intent": "river"}) + "\n\n"
                        elif name == "location_tool":
                            display_name = "Finding nearby water sources..."
                        elif name == "meteo_tool":
                            display_name = "Checking official meteorological advisories..."
                            yield "event: detected_intent\ndata: " + json.dumps({"intent": "meteo"}) + "\n\n"
                        else:
                            display_name= "Working on a task..."
                        yield "event: status\ndata: " + json.dumps({"content": display_name}) + "\n\n"
                    elif ev.get("event") == "on_tool_end":
                        name = ev.get("name") or "tool"
                        yield "event: status\ndata: " + json.dumps({"content": "Thinking..."}) + "\n\n"

                # Flush final from buffer (if tags present)
                thinking, final = _extract_thinking_final(buffer)
                yield "event: done\ndata: " + json.dumps({"thinking": thinking, "final": final}) + "\n\n"
                return
            except Exception as e:
                errors[prov_display] = str(e)
                yield "event: status\ndata: " + json.dumps({"content": "Trying Next..."}) + "\n\n"
                await asyncio.sleep(0.05)

        diagnostic = "I'm sorry, I encountered an issue connecting to all available AI model providers (Google Gemini).\n\n"
        for prov, err in errors.items():
            diagnostic += f"* **{prov}**: Issue ({err[:100]}...)\n"
        diagnostic += "\n*Please check your Google API keys and quota limits.*"
        
        yield "event: done\ndata: " + json.dumps({"thinking": "", "final": diagnostic}) + "\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
    
    
@app.get("/feedback")
def feedback(session_id: str, type: str):
    config = {"configurable": {"thread_id": session_id}}
    
    if type == "good":
        feedback_msg = SystemMessage(
            content="[System Note: The user liked your previous response (gave THUMBS UP). They found it very helpful. Maintain this style, accuracy, and tone!]"
        )
    elif type == "bad":
        feedback_msg = SystemMessage(
            content="[System Note: The user disliked your previous response (gave THUMBS DOWN). They found it unhelpful or unsatisfactory. Please adjust your tone, be more concise/detailed where needed, and ensure higher accuracy in your next responses!]"
        )
    else:
        return {"status": "ignored"}
        
    # Append the feedback SystemMessage to all agents across all keys
    for key_label, agents in agents_by_key.items():
        for model_name, agent in agents.items():
            agent.update_state(config, {"messages": [feedback_msg]})
    return {"status": "success"}
    
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class RiverPredictionRequest(BaseModel):
    river_name: str
    historical_data: List[Dict[str, Any]]
    weather_data: Optional[Dict[str, Any]] = None

class MeteoPredictionRequest(BaseModel):
    location: str
    

@app.post("/api/predict/river")
async def predict_river_level(req: RiverPredictionRequest):
    try:
        if not req.historical_data:
            return {"predicted_level": None, "error": "No historical data provided"}
            
        current_level = req.historical_data[-1].get("y")
        if current_level is None:
            return {"predicted_level": None, "error": "No current level found"}
            
        # Format the data for the LLM
        recent_history = req.historical_data[-60:] # Last hour if 1pt/min
        valid_history = [p.get("y") for p in recent_history if p.get("y") is not None]
        history_str = ", ".join(map(str, valid_history))
        
        # Calculate simple linear trend (slope) over the recent history
        trend_slope = 0.0
        if len(valid_history) > 1:
            trend_slope = (valid_history[-1] - valid_history[0]) / len(valid_history)
        
        # Extrapolate for 3 hours (assuming 1 pt/min, 180 points)
        math_predicted_level = current_level + (trend_slope * 180)
        math_predicted_level = round(math_predicted_level, 2)
        
        weather_str = "No specific weather data available."
        
        # 1. Try to find an associated city for the river
        target_city = req.river_name
        for city, rivers in CITY_RIVERES.items():
            if any(r.lower() in req.river_name.lower() or req.river_name.lower() in r.lower() for r in rivers):
                target_city = city
                break
                
        # 2. Fetch actual weather data
        actual_weather = get_city_weather(target_city)
        if actual_weather and isinstance(actual_weather, dict) and "weather" in actual_weather:
            hourly = actual_weather.get("weather", {}).get("hourly", [])
            if hourly and len(hourly) > 3:
                next_3h = hourly[1:4]
                weather_str = f"Next 3 hours rainfall: {[h.get('precip_mm', 0) for h in next_3h]} mm."
            else:
                daily = actual_weather.get("weather", {}).get("daily", [])
                if daily and len(daily) > 0:
                    weather_str = f"Today's rain chance: {daily[0].get('daily_chance_of_rain', 0)}%"

        # 3. Get other stations in the same river basin (Upstream/Downstream gauges)
        basin_name = req.river_name.split("-")[0].strip()
        basin_data_str = "No other station data available."
        try:
            basin_alerts = get_river_alerts(basin_name, is_basin=True)
            if isinstance(basin_alerts, list) and len(basin_alerts) > 0:
                other_stations = [s for s in basin_alerts if isinstance(s, dict) and s.get("name") != req.river_name]
                if other_stations:
                    station_info = []
                    for s in other_stations:
                        s_name = s.get("name", "").replace(basin_name, "").strip(" -")
                        s_level = s.get("currentLevel", "N/A")
                        s_trend = s.get("status", "Unknown")
                        if s_level != "N/A":
                            # Get topological relationship
                            rel_pos = get_relative_position(basin_name, req.river_name, s.get("name", ""))
                            label = f" ({rel_pos})" if rel_pos else ""
                            station_info.append(f"{s_name}{label}: {s_level}m ({s_trend})")
                    if station_info:
                        basin_data_str = "Other connected stations (Upstream/Downstream): " + ", ".join(station_info)
        except Exception as e:
            print("Failed to fetch basin data:", e)

        prompt = f"""
You are an expert hydrological AI. Your task is to predict the water level of {req.river_name} EXACTLY 3 hours from now.
Use the following real-time data:
1. Current Level: {current_level}m
2. Recent History (last {len(valid_history)} points): [{history_str}]
3. Calculated Math Trend (Base Prediction): {math_predicted_level}m (assuming current rate continues)
4. Weather Context: {weather_str}
5. Basin Context: {basin_data_str}

Analyze the Calculated Math Trend, expected rainfall, and the levels of connected upstream/downstream stations. If upstream stations show High Alert or rising levels, or if heavy rain is expected, adjust the level higher. If no rain and upstream is safe, keep it close to the math trend.
IMPORTANT: You MUST return ONLY a raw JSON object with NO markdown formatting, NO backticks, and NO explanations.
Format:
{{"predicted_level": 5.45}}
"""
        
        # We will use the first available agent/LLM (e.g., Key A Google)
        available_keys = sorted(key_llms.keys())
        if not available_keys:
            return {"predicted_level": None, "error": "No AI providers available"}
            
        response = None
        
        # 1. Try Gemini 3.1 Pro on all available keys
        for key in available_keys:
            try:
                llm = key_llms[key]["pro"]
                response = await llm.ainvoke(prompt)
                break # Success
            except Exception as e:
                print(f"Gemini 3.1 Pro failed on Key {key}: {e}")
                
        # 2. If all Pro attempts failed, try Gemma 4 on all keys
        if response is None:
            print("All Gemini 3.1 Pro keys failed. Switching to Gemma 4...")
            for key in available_keys:
                try:
                    llm = key_llms[key]["gemma"]
                    response = await llm.ainvoke(prompt)
                    break # Success
                except Exception as e2:
                    print(f"Gemma 4 failed on Key {key}: {e2}")

        if response is None:
            return {"predicted_level": current_level, "error": "All AI models and keys failed"}
            
        content = response.content.strip()
        
        # Clean up any markdown code blocks the LLM might have ignored instructions and added
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print("Failed to parse JSON:", content)
            return {"predicted_level": current_level, "error": f"Invalid JSON response: {e}"}

    except Exception as e:
        print("Prediction error:", str(e))
        return {"predicted_level": None, "error": str(e)}

@app.post("/api/predict/meteo")
async def predict_meteo_alerts(req: MeteoPredictionRequest):
    try:
        # 1. Fetch official Meteo Data & PDF Parsed Alerts
        meteo_data = get_meteo_alerts()
        meteo_str = json.dumps(meteo_data) if meteo_data else "No official meteo alerts available."

        # 2. Fetch local weather
        local_weather = get_city_weather(req.location)
        weather_str = json.dumps(local_weather) if local_weather else "No local weather data available."

        prompt = f"""
You are an expert Meteorological and Geological AI. Your task is to evaluate the risk of Thunderstorms and Landslides for: {req.location}.

Use the following real-time data:
1. Official Meteorological Advisories & Parsed PDFs: {meteo_str}
2. Local Weather Forecast for the area: {weather_str}

Analyze the data. High temperature and high humidity suggest thunderstorm risk. Continuous heavy rainfall (especially > 100mm) suggests landslide risk. Check if {req.location} is mentioned in any official advisory warnings.

IMPORTANT: You MUST return ONLY a raw JSON object with NO markdown formatting, NO backticks, and NO explanations.
Format exactly like this:
{{
  "thunderstorm_risk": "Low" or "Moderate" or "High" or "Severe",
  "landslide_risk": "Low" or "Moderate" or "High" or "Severe",
  "summary_sinhala": "සිංහලෙන් කෙටි විස්තරය",
  "summary_english": "Short description in English"
}}
"""

        available_keys = sorted(key_llms.keys())
        if not available_keys:
            return {"error": "No AI providers available"}
            
        response = None
        
        # 1. Try Gemini 3.1 Pro on all available keys
        for key in available_keys:
            try:
                llm = key_llms[key]["pro"]
                response = await llm.ainvoke(prompt)
                break
            except Exception as e:
                print(f"Meteo: Gemini 3.1 Pro failed on Key {key}: {e}")
                
        # 2. If all Pro attempts failed, try Gemma 4 on all keys
        if response is None:
            for key in available_keys:
                try:
                    llm = key_llms[key]["gemma"]
                    response = await llm.ainvoke(prompt)
                    break
                except Exception as e2:
                    print(f"Meteo: Gemma 4 failed on Key {key}: {e2}")

        if response is None:
            return {"error": "All AI models and keys failed"}
            
        content = response.content.strip()
        
        # Clean up any markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print("Failed to parse JSON:", content)
            return {"error": f"Invalid JSON response: {e}"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/")
def root():

    return {
        "message": "RainiX AI is running",
        "google_keys_active": list(key_llms.keys()),
        "models_per_key": [cfg["name"] for cfg in MODEL_CONFIGS]
    }