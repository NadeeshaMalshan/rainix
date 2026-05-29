from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from langchain_google_genai import (ChatGoogleGenerativeAI)
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import (create_react_agent)
from langgraph.checkpoint.memory import MemorySaver
from tools.weather_tool import (get_city_weather)
from tools.river_tool import (get_river_alerts)
from tools.location_tool import (find_rivers)
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
}


MODEL_CONFIGS = [
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
    Find rivers near a city.
    """

    return find_rivers(city)


memory = MemorySaver()

agent_prompt = (
   "You are rainiX AI, an elite real-time weather and river flood safety assistant.\n\n"

"Your mission is to perform comprehensive, high-quality safety assessments. "

"When a user asks about flood risks, river safety, or whether they should worry about a river tonight:\n"

"1. **Identify the Nearby River System**: Use maps, geographic tools, and location analysis to determine the nearest major river, tributary, or flood-prone waterway associated with the user's mentioned town, village, or region.\n"

"2. **Check River Telemetry**: Call `river_tool` for that region/river to get the current level, historical water level readings, river is rising, falling or stable, and alert thresholds (Alert, Minor, Major, Critical).\n"

"3. **Check Weather Forecast**: Call `weather_tool` for the associated city/region to analyze the current weather, precipitation, and specifically the hourly rain/precipitation probability forecast for tonight.\n"

"4. **Analyze the Risk**: Synthesize the two data points: if the river water level is high (near or above Alert/Minor thresholds) AND river status (rising/falling/stable) AND speed of rising/falling AND the forecast predicts heavy rain or high precipitation probability tonight, report an elevated risk. Otherwise, if the weather is clear and levels are normal, reassure the user.\n\n"

"Formatting Rules:\n"

"- Formulate a friendly, highly professional, and reassuring final response using clear bullet lists and bold text for telemetry details.\n"

"- CRITICAL: If `river_tool` returns multiple telemetry stations/gauges for a basin, you MUST list the current level, thresholds, and status for ALL of them! Do not just summarize the first one.\n"

"- CRITICAL: Even if you are responding in Sinhala or another language, you MUST include the exact English name of the river in your final output (you can put it in brackets). This is strictly required for the UI to display the telemetry cards!\n"

"- If any tool returns empty/null, do not loop or call it repeatedly; state that the specific metric was unavailable and continue with the remaining data."

    "OUTPUT FORMAT (return exactly this, nothing else):\n"
    "<final>\n"
    "Write the user-facing answer here.\n"
    "</final>\n"
)


_THINKING_RE = re.compile(r"<thinking>(.*?)</thinking>", re.DOTALL | re.IGNORECASE)
_THOUGHT_RE = re.compile(r"<thought>(.*?)</thought>", re.DOTALL | re.IGNORECASE)
_FINAL_RE = re.compile(r"<final>(.*?)</final>", re.DOTALL | re.IGNORECASE)


def _extract_thinking_final(text: str):
    if not isinstance(text, str):
        return "", ""
    f_match = _FINAL_RE.search(text)
    final = (f_match.group(1).strip() if f_match else "")
    # Token-optimized: we no longer request/emit chain-of-thought.
    # If <final> tags are missing, treat entire text as final.
    if not final:
        return "", text.strip()
    return "", final


def _extract_partials(buffer: str):
    """Return (thinking_partial, final_partial) for streaming.

    Token-optimized: we do not stream any chain-of-thought, only <final>.
    """
    if not isinstance(buffer, str) or not buffer:
        return "", ""

    lower = buffer.lower()

    final = ""
    f_start = lower.find("<final>")
    f_end = lower.find("</final>")
    if f_start != -1:
        start = f_start + len("<final>")
        end = f_end if f_end != -1 else len(buffer)
        final = buffer[start:end].strip()

    return "", final


# ──────────────────────────────────────────────────────────────────────
# Build agents for each (key, model) combination
# agents_by_key[key_label][model_name] = agent
# ──────────────────────────────────────────────────────────────────────
tools_list = [weather_tool, river_tool, location_tool]

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
                            if final != last_final:
                                last_final = final
                                yield "event: final_partial\ndata: " + json.dumps({"content": last_final}) + "\n\n"
                    
                    elif ev.get("event") == "on_tool_start":
                        name = ev.get("name") or "tool"
                        
                        # Extract exact location from tool inputs for the frontend
                        input_data = ev.get("data", {}).get("input", {})
                        loc = input_data.get("location") or input_data.get("region") or input_data.get("city")
                        if loc and isinstance(loc, str):
                            yield "event: detected_location\ndata: " + json.dumps({"location": loc}) + "\n\n"
                            
                        if name == "weather_tool":
                            display_name = "Connecting to weather services..."
                            yield "event: detected_intent\ndata: " + json.dumps({"intent": "weather"}) + "\n\n"
                        elif name == "river_tool":
                            display_name = "Fetching river telemetry..."
                            yield "event: detected_intent\ndata: " + json.dumps({"intent": "river"}) + "\n\n"
                        elif name == "location_tool":
                            display_name = "Finding nearby water sources..."
                        else:
                            display_name= "Working on a task..."
                        yield "event: status\ndata: " + json.dumps({"content": display_name}) + "\n\n"
                    elif ev.get("event") == "on_tool_end":
                        name = ev.get("name") or "tool"
                        yield "event: status\ndata: " + json.dumps({"content": "Thinking..."}) + "\n\n"

                # Flush final from buffer (if tags present)
                thinking, final = _extract_thinking_final(buffer)
                yield "event: done\ndata: " + json.dumps({"thinking": "", "final": final}) + "\n\n"
                return
            except Exception as e:
                errors[prov_display] = str(e)
                yield "event: status\ndata: " + json.dumps({"content": f"Provider {prov_display} failed, trying next..."}) + "\n\n"
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
        history_str = ", ".join([str(p.get("y")) for p in recent_history if p.get("y") is not None])
        
        weather_str = "No specific weather data available."
        if req.weather_data:
            # Extract relevant forecast (next 3 hours)
            hourly = req.weather_data.get("weather", {}).get("hourly", [])
            if hourly and len(hourly) > 3:
                next_3h = hourly[1:4]
                weather_str = f"Next 3 hours rainfall: {[h.get('precip_mm', 0) for h in next_3h]} mm."
            else:
                weather_str = f"Today's rain chance: {req.weather_data.get('weather', {}).get('daily', [{}])[0].get('daily_chance_of_rain', 0)}%"

        prompt = f"""
You are an expert hydrological AI. Your task is to predict the water level of {req.river_name} EXACTLY 3 hours from now.
Use the following real-time data:
1. Current Level: {current_level}m
2. Recent History (last {len(recent_history)} points): [{history_str}]
3. Weather Context: {weather_str}

Analyze the rate of change in the history and the expected rainfall.
IMPORTANT: You MUST return ONLY a raw JSON object with NO markdown formatting, NO backticks, and NO explanations.
Format:
{{"predicted_level": 5.45}}
"""
        
        # We will use the first available agent/LLM (e.g., Key A Google)
        available_keys = sorted(key_llms.keys())
        if not available_keys:
            return {"predicted_level": None, "error": "No AI providers available"}
            
        llm = key_llms[available_keys[0]]["google"] # Default to Gemini Flash
        response = await llm.ainvoke(prompt)
        content = response.content.strip()
        
        # Clean up any markdown code blocks the LLM might have ignored instructions and added
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        try:
            data = json.loads(content)
            predicted_level = float(data.get("predicted_level", current_level))
            return {"predicted_level": predicted_level}
        except json.JSONDecodeError:
            print("Failed to decode JSON from prediction:", content)
            return {"predicted_level": current_level, "error": "Invalid prediction format"}

    except Exception as e:
        print("Prediction error:", str(e))
        return {"predicted_level": None, "error": str(e)}

@app.get("/")
def root():

    return {
        "message": "RainiX AI is running",
        "google_keys_active": list(key_llms.keys()),
        "models_per_key": [cfg["name"] for cfg in MODEL_CONFIGS]
    }