from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

llm_google = ChatGoogleGenerativeAI(
    model='gemini-3.5-flash',
    temperature=0.2
)

llm_gem3 = ChatGoogleGenerativeAI(
    model='gemini-3.1-flash-lite',
    temperature=0.2
)

llm_gemma = ChatGoogleGenerativeAI(
    model='gemma-4-31b-it',
    temperature=0.2
)

llm_openai = ChatOpenAI(
    model='gpt-4o-mini',
    temperature=0.2
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
    "When a user asks about flood risks, river safety, or whether they should worry about a river (e.g., Kalu Ganga) tonight:\n"
    "1. **Locate the River**: Use the tools to find out which city/region the river is located in (e.g., Kalu Ganga is associated with Ratnapura, Millakanda, etc.).\n"
    "2. **Check River Telemetry**: Call `river_tool` for that region/river to get the current level, historical water level readings, and alert thresholds (Alert, Minor, Major, Critical).\n"
    "3. **Check Weather Forecast**: Call `weather_tool` for the associated city/region to analyze the current weather, precipitation, and specifically the hourly rain/precipitation probability forecast for tonight.\n"
    "4. **Analyze the Risk**: Synthesize the two data points: if the river water level is high (near or above Alert/Minor thresholds) AND the forecast predicts heavy rain or high precipitation probability tonight, report an elevated risk. Otherwise, if the weather is clear and levels are normal, reassure the user.\n\n"
    "Formatting Rules:\n"
    "- Formulate a friendly, highly professional, and reassuring final response using clear bullet lists and bold text for telemetry details.\n"
    "- If any tool returns empty/null, do not loop or call it repeatedly; state that the specific metric was unavailable and continue with the remaining data."
)

agent_google = create_react_agent(
    llm_google,
    tools=[
        weather_tool,
        river_tool,
        location_tool
    ],
    prompt=agent_prompt,
    checkpointer=memory
)

agent_gem3 = create_react_agent(
    llm_gem3,
    tools=[
        weather_tool,
        river_tool,
        location_tool
    ],
    prompt=agent_prompt,
    checkpointer=memory
)

agent_gemma = create_react_agent(
    llm_gemma,
    tools=[
        weather_tool,
        river_tool,
        location_tool
    ],
    prompt=agent_prompt,
    checkpointer=memory
)

agent_openai = create_react_agent(
    llm_openai,
    tools=[
        weather_tool,
        river_tool,
        location_tool
    ],
    prompt=agent_prompt,
    checkpointer=memory
)


@app.get("/chat")
def chat(q: str, session_id: str = "default", provider: str = "google"):

    # Pass the thread_id to identify the unique user session memory
    config = {"configurable": {"thread_id": session_id}}

    agents = {
        "google": agent_google,
        "gem3": agent_gem3,
        "gemma": agent_gemma,
        "openai": agent_openai
    }

    # Define the fallback chain based on the chosen provider or "auto"
    if provider == "auto":
        fallback_order = ["google", "gem3", "gemma", "openai"]
    elif provider in agents:
        others = [k for k in ["google", "gem3", "gemma", "openai"] if k != provider]
        fallback_order = [provider] + others
    else:
        fallback_order = ["google", "gem3", "gemma", "openai"]

    errors = {}
    for prov in fallback_order:
        try:
            active_agent = agents[prov]
            response = active_agent.invoke({
                "messages": [
                    ("user", q)
                ]
            }, config=config)
            final_message = response["messages"][-1].content
            return {
                "response": final_message,
                "provider": prov,
                "switched": prov != fallback_order[0]
            }
        except Exception as e:
            err_str = str(e)
            print(f"Error invoking model '{prov}': {err_str}")
            errors[prov] = err_str

    # If all models fail, return a complete diagnostic of all 4 models
    diagnostic = "I'm sorry, I encountered an issue connecting to all available AI model providers. Here is a detailed diagnostic:\n\n"
    
    # Gemini 3.5
    e_google = errors.get("google", "Unknown error")
    if "RESOURCE_EXHAUSTED" in e_google or "429" in e_google:
        diagnostic += "* **Gemini 3.5 Flash**: Quota limit exceeded (429 RESOURCE_EXHAUSTED).\n"
    elif "API_KEY" in e_google or "invalid" in e_google.lower():
        diagnostic += "* **Gemini 3.5 Flash**: Invalid/unconfigured API key.\n"
    else:
        diagnostic += f"* **Gemini 3.5 Flash**: Issue ({e_google[:60]}...)\n"

    # Gemini 3.1
    e_gem3 = errors.get("gem3", "Unknown error")
    if "RESOURCE_EXHAUSTED" in e_gem3 or "429" in e_gem3:
        diagnostic += "* **Gemini 3.1 Lite**: Quota limit exceeded (429 RESOURCE_EXHAUSTED).\n"
    elif "API_KEY" in e_gem3 or "invalid" in e_gem3.lower():
        diagnostic += "* **Gemini 3.1 Lite**: Invalid/unconfigured API key.\n"
    else:
        diagnostic += f"* **Gemini 3.1 Lite**: Issue ({e_gem3[:60]}...)\n"

    # Gemma 4
    e_gemma = errors.get("gemma", "Unknown error")
    if "RESOURCE_EXHAUSTED" in e_gemma or "429" in e_gemma:
        diagnostic += "* **Gemma 4 (31B)**: Quota limit exceeded (429 RESOURCE_EXHAUSTED).\n"
    elif "API_KEY" in e_gemma or "invalid" in e_gemma.lower():
        diagnostic += "* **Gemma 4 (31B)**: Invalid/unconfigured API key.\n"
    else:
        diagnostic += f"* **Gemma 4 (31B)**: Issue ({e_gemma[:60]}...)\n"

    # OpenAI GPT
    e_openai = errors.get("openai", "Unknown error")
    if "insufficient_quota" in e_openai or "quota" in e_openai.lower():
        diagnostic += "* **GPT-4o Mini**: Insufficient account balance or quota.\n"
    elif "429" in e_openai or "rate_limit" in e_openai.lower():
        diagnostic += "* **GPT-4o Mini**: Rate limit exceeded.\n"
    else:
        diagnostic += f"* **GPT-4o Mini**: Issue ({e_openai[:60]}...)\n"

    diagnostic += "\n*Please review your API key balances and settings, or wait a minute before retrying.*"
    return {
        "response": diagnostic,
        "provider": "failed"
    }
    
    
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
        
    # Append the feedback SystemMessage to the thread state for all 4 model providers
    agent_google.update_state(config, {"messages": [feedback_msg]})
    agent_gem3.update_state(config, {"messages": [feedback_msg]})
    agent_gemma.update_state(config, {"messages": [feedback_msg]})
    agent_openai.update_state(config, {"messages": [feedback_msg]})
    return {"status": "success"}
    
    
@app.get("/")
def root():

    return {
        "message": "RainiX AI is running"
    }