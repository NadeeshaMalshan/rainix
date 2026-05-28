from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from langchain_google_genai import (ChatGoogleGenerativeAI)
from langchain_openai import ChatOpenAI
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

# ──────────────────────────────────────────────────────────────────────
# Google API Keys (3 keys for fallback rotation)
# ──────────────────────────────────────────────────────────────────────
GOOGLE_API_KEYS = {
    "A": os.getenv("GOOGLE_API_KEY_A", ""),
    "B": os.getenv("GOOGLE_API_KEY_B", ""),
    "C": os.getenv("GOOGLE_API_KEY_C", ""),
}

# ──────────────────────────────────────────────────────────────────────
# Model definitions for each key
# Each key gets its own set of 3 Google models
# ──────────────────────────────────────────────────────────────────────
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

# OpenAI fallback (unchanged)
llm_openai = ChatOpenAI(
    model='gpt-4o-mini',
    temperature=0.2,
    streaming=True
)

@tool
def weather_tool(city: str):

    """
    Get weather and flood data
    for a city.
    """

    return get_city_weather(city)


@tool
def river_tool(region: str):

    """
    Get river alert data
    for a region.
    """

    return get_river_alerts(region)



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
    "1. **Locate the River**: Use the tools to find out which city/region the river is located in.\n"
    "2. **Check River Telemetry**: Call `river_tool` for that region/river to get the current level, historical water level readings, river is rising, falling or stable, and alert thresholds (Alert, Minor, Major, Critical).\n"
    "3. **Check Weather Forecast**: Call `weather_tool` for the associated city/region to analyze the current weather, precipitation, and specifically the hourly rain/precipitation probability forecast for tonight.\n"
    "4. **Analyze the Risk**: Synthesize the two data points: if the river water level is high (near or above Alert/Minor thresholds)AND river status (rising/falling/stable) AND speed of rising, falling AND the forecast predicts heavy rain or high precipitation probability tonight, report an elevated risk. Otherwise, if the weather is clear and levels are normal, reassure the user.\n\n"
    "Formatting Rules:\n"
    "- Formulate a friendly, highly professional, and reassuring final response using clear bullet lists and bold text for telemetry details.\n"
    "- If any tool returns empty/null, do not loop or call it repeatedly; state that the specific metric was unavailable and continue with the remaining data."
    "\n\n"
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

# OpenAI agent (single, unchanged)
agent_openai = create_react_agent(
    llm_openai,
    tools=tools_list,
    prompt=agent_prompt,
    checkpointer=memory
)


def _build_fallback_order(provider: str):
    """
    Build the full fallback chain.

    Strategy:
      - For a specific Google model (e.g. "google"), try:
        Key A google → Key B google → Key C google →
        Key A gem3 → Key B gem3 → Key C gem3 →
        Key A gemma → Key B gemma → Key C gemma → openai
      - For "auto", same as "google" (starts with best model).
      - For "openai", try openai first, then all Google combos.

    Each entry is ("key_label", "model_name") or ("openai", "openai").
    """
    available_keys = sorted(agents_by_key.keys())  # ["A", "B", "C"]
    model_names = [cfg["name"] for cfg in MODEL_CONFIGS]  # ["google", "gem3", "gemma"]

    if provider == "openai":
        chain = [("openai", "openai")]
        for m in model_names:
            for k in available_keys:
                if m in agents_by_key.get(k, {}):
                    chain.append((k, m))
        return chain

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
    chain.append(("openai", "openai"))
    return chain


def _get_agent(key_label: str, model_name: str):
    """Get the agent for a given key+model combo, or the OpenAI agent."""
    if key_label == "openai":
        return agent_openai
    return agents_by_key[key_label][model_name]


def _get_provider_display(key_label: str, model_name: str):
    """Get a human-readable provider name for the response."""
    if key_label == "openai":
        return "openai"
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
                        yield "event: status\ndata: " + json.dumps({"content": f"Calling {name}..."}) + "\n\n"
                    elif ev.get("event") == "on_tool_end":
                        name = ev.get("name") or "tool"
                        yield "event: status\ndata: " + json.dumps({"content": f"Finished {name}."}) + "\n\n"

                # Flush final from buffer (if tags present)
                thinking, final = _extract_thinking_final(buffer)
                yield "event: done\ndata: " + json.dumps({"thinking": "", "final": final}) + "\n\n"
                return
            except Exception as e:
                errors[prov_display] = str(e)
                yield "event: status\ndata: " + json.dumps({"content": f"Provider {prov_display} failed, trying next..."}) + "\n\n"
                await asyncio.sleep(0.05)

        diagnostic = "All providers failed.\n" + json.dumps(errors, indent=2)
        yield "event: error\ndata: " + json.dumps({"message": diagnostic}) + "\n\n"

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
    agent_openai.update_state(config, {"messages": [feedback_msg]})
    return {"status": "success"}
    
    
@app.get("/")
def root():

    return {
        "message": "RainiX AI is running",
        "google_keys_active": list(key_llms.keys()),
        "models_per_key": [cfg["name"] for cfg in MODEL_CONFIGS]
    }