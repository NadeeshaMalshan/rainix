from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_google_genai import (ChatGoogleGenerativeAI)
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

llm = ChatGoogleGenerativeAI(
    model='gemma-4-31b-it',
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

agent = create_react_agent(
    llm,
    tools=[
        weather_tool,
        river_tool,
        location_tool
    ],
    prompt=(
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
    ),
    checkpointer=memory
)


@app.get("/chat")
def chat(q: str, session_id: str = "default"):

    # Pass the thread_id to identify the unique user session memory
    config = {"configurable": {"thread_id": session_id}}

    # Agent invoke with session history config
    response = agent.invoke({
        "messages": [
            ("user", q)
        ]
    }, config=config)

    final_message = response["messages"][-1].content
    return {
        "response": final_message
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
        
    # Append the feedback SystemMessage to the thread state
    agent.update_state(config, {"messages": [feedback_msg]})
    return {"status": "success"}
    
    
@app.get("/")
def root():

    return {
        "message": "RainiX AI is running"
    }