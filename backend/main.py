from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NagarIq Smart City API Gateway", description="Real-time API for Smart City Dashboard endpoints.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys from Environment
CPCB_API_KEY = os.getenv("CPCB_API_KEY", "")
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")
OWM_API_KEY = os.getenv("OWM_API_KEY", "")

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "city_data.json")

def load_fallback_data():
    """Loads static fallback data if external APIs fail or keys are missing."""
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r") as f:
        return json.load(f)

async def fetch_cpcb_aqi():
    """Fetch live AQI data from data.gov.in (CPCB)"""
    # Assuming Delhi coordinates/station for demonstration
    if not CPCB_API_KEY:
        return load_fallback_data().get("environment", [])
    
    url = f"https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key={CPCB_API_KEY}&format=json&limit=10"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                # Transform to frontend expected format
                if "records" in data and len(data["records"]) > 0:
                     # Simulate a time-series by repeating current data with slight variations for demo
                     # In a real app, you'd fetch historical or wait to accumulate
                     current_record = data["records"][0]
                     pm25 = float(current_record.get('pollutant_min', 40)) # Defaulting to safe values if parse fails
                     aqi = int(pm25 * 2.5) # rough approximation if AQI explicitly isn't present
                     
                     return [
                         { "time": "Now", "aqi": aqi, "pm25": pm25, "temperature": 28 },
                         { "time": "-1H", "aqi": aqi - 5, "pm25": pm25 - 2, "temperature": 27 },
                         { "time": "-2H", "aqi": aqi + 10, "pm25": pm25 + 4, "temperature": 27 },
                         { "time": "-3H", "aqi": aqi + 2, "pm25": pm25 + 1, "temperature": 26 }
                     ]
            print(f"CPCB API Failed: {response.status_code}")
            return load_fallback_data().get("environment", [])
    except Exception as e:
        print(f"CPCB Exception: {str(e)}")
        return load_fallback_data().get("environment", [])

async def fetch_tomtom_traffic():
    """Fetch live traffic from TomTom"""
    if not TOMTOM_API_KEY:
         return load_fallback_data().get("traffic", [])
    
    # 28.6139, 77.2090 (New Delhi)
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={TOMTOM_API_KEY}&point=28.6139,77.2090"
    try:
         async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                flow = data.get("flowSegmentData", {})
                current_speed = flow.get("currentSpeed", 30)
                free_flow = flow.get("freeFlowSpeed", 50)
                
                # Calculate simple congestion index 
                congestion = int(max(0, (1 - (current_speed / max(1, free_flow))) * 100))
                
                return [
                     { "time": "Now", "congestionIndex": congestion, "avgSpeed": current_speed },
                     { "time": "-1H", "congestionIndex": max(0, congestion - 10), "avgSpeed": current_speed + 5 },
                     { "time": "-2H", "congestionIndex": min(100, congestion + 20), "avgSpeed": max(5, current_speed - 10) }
                ]
            print(f"TomTom API Failed: {response.status_code}")
            return load_fallback_data().get("traffic", [])
    except Exception as e:
         print(f"TomTom Exception: {str(e)}")
         return load_fallback_data().get("traffic", [])

@app.get("/")
def read_root():
    return {"message": "Welcome to the NagarIq Data Gateway"}

@app.get("/api/overview")
def get_overview():
    return load_fallback_data().get("kpis", {})

@app.get("/api/all-metrics")
async def get_all_metrics():
    # Fetch data concurrently
    environment, traffic = await asyncio.gather(
        fetch_cpcb_aqi(), 
        fetch_tomtom_traffic()
    )
    
    fallback = load_fallback_data()
    
    # Dynamically calculate KPIs based on live data if available
    latest_aqi = 50
    if environment and isinstance(environment, list) and len(environment) > 0 and "aqi" in environment[0]:
        latest_aqi = environment[0]["aqi"]
        
    latest_congestion = 25
    if traffic and isinstance(traffic, list) and len(traffic) > 0 and "congestionIndex" in traffic[0]:
        latest_congestion = traffic[0]["congestionIndex"]
    
    kpis = {
        "overallEfficiency": int(100 - (latest_congestion * 0.3) - (latest_aqi * 0.1)),
        "activeSensors": 3420 + (10 if CPCB_API_KEY else 0) + (15 if TOMTOM_API_KEY else 0),
        "criticalAlerts": 1 if latest_aqi > 150 or latest_congestion > 80 else 0,
        "energySaved": "15.4%",
        "trafficFlowIdx": latest_congestion
    }
    
    return {
        "kpis": kpis,
        "environment": environment[::-1] if isinstance(environment, list) else [], # Reverse for chart chronological order
        "traffic": traffic[::-1] if isinstance(traffic, list) else [],
        "energy": fallback.get("energy", []), # No public live energy grid APIs usually available
        "transport": fallback.get("transport", []),
        "water": fallback.get("water", [])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
