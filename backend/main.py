from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import httpx
import asyncio
import networkx as nx
from typing import List, Tuple
from pydantic import BaseModel
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
TRAFFIC_DATA_PATH = os.path.join(os.path.dirname(__file__), "../frontend/public/data/live_traffic.json")
METRO_DATA_PATH = os.path.join(os.path.dirname(__file__), "../frontend/public/data/metro_data.json")

class RouteRequest(BaseModel):
    start: Tuple[float, float] # [lon, lat]
    end: Tuple[float, float]
    mode: str # 'car', 'bike', 'cycle', 'pedestrian'

def load_fallback_data():
    """Loads static fallback data if external APIs fail or keys are missing."""
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def build_traffic_graph(mode: str):
    """Build a networkx graph from live traffic data for a specific mode"""
    if not os.path.exists(TRAFFIC_DATA_PATH):
        return None
    
    with open(TRAFFIC_DATA_PATH, "r") as f:
        data = json.load(f)
    
    G = nx.Graph()
    for feature in data['features']:
        props = feature['properties']
        geom = feature['geometry']
        
        segment_mode = props.get('modalType', 'car')
        # Mode-based filtering logic
        if mode in ['car', 'bus'] and segment_mode in ['cycle', 'pedestrian']:
            continue
        if mode == 'cycle' and segment_mode == 'pedestrian':
            continue
        # bike (two-wheeler) can go almost anywhere car goes, but car can't go through cycleways
        
        coords = geom['coordinates']
        for i in range(len(coords) - 1):
            p1 = tuple(coords[i][:2])
            p2 = tuple(coords[i+1][:2])
            # Use distance as base weight
            dist = ((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**0.5
            congestion = props.get('congestion', 0.1)
            # Add congestion penalty to weight
            weight = dist * (1 + congestion * 10) 
            G.add_edge(p1, p2, weight=weight)

    if len(G.nodes()) == 0:
        return None

    # Crucial: Return the largest connected component to ensure connectivity
    components = sorted(nx.connected_components(G), key=len, reverse=True)
    G_main = G.subgraph(components[0]).copy()
    print(f"Graph built for {mode}: {len(G.nodes())} nodes, {len(G.edges())} edges. LCC: {len(G_main.nodes())} nodes.")
    return G_main

def find_nearest_node(G, point):
    nodes = list(G.nodes())
    if not nodes:
        return None
    return min(nodes, key=lambda n: (n[0]-point[0])**2 + (n[1]-point[1])**2)

async def fetch_cpcb_aqi():
    """Fetch live AQI data from data.gov.in (CPCB)"""
    if not CPCB_API_KEY:
        return load_fallback_data().get("environment", [])
    url = f"https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key={CPCB_API_KEY}&format=json&limit=10"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if "records" in data and len(data["records"]) > 0:
                     current_record = data["records"][0]
                     pm25 = float(current_record.get('pollutant_min', 40))
                     aqi = int(pm25 * 2.5)
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
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={TOMTOM_API_KEY}&point=28.6139,77.2090"
    try:
         async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                flow = data.get("flowSegmentData", {})
                current_speed = flow.get("currentSpeed", 30)
                free_flow = flow.get("freeFlowSpeed", 50)
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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "routes": [r.path for r in app.routes]}

@app.get("/")
def read_root():
    return {"message": "Welcome to the NagarIq Data Gateway"}

@app.get("/api/overview")
def get_overview():
    return load_fallback_data().get("kpis", {})

@app.get("/api/metro-metrics")
async def get_metro_metrics():
    if not os.path.exists(METRO_DATA_PATH):
        raise HTTPException(status_code=404, detail="Metro data not available")
    with open(METRO_DATA_PATH, "r") as f:
        return json.load(f)

@app.get("/api/all-metrics")
async def get_all_metrics():
    environment, traffic = await asyncio.gather(fetch_cpcb_aqi(), fetch_tomtom_traffic())
    
    metro_summary = {"status": "Operational", "ridership": 24500}
    metro_history = []
    if os.path.exists(METRO_DATA_PATH):
        with open(METRO_DATA_PATH, "r") as f:
            metro_data = json.load(f)
            total_ridership = sum(s.get('ridership', 0) for s in metro_data.get('stations', []))
            maintenance_count = sum(1 for s in metro_data.get('stations', []) if s.get('status') == 'Maintenance')
            metro_summary = {
                "status": "All Systems Normal" if maintenance_count == 0 else f"{maintenance_count} Stations under Maintenance",
                "ridership": total_ridership,
                "lines": len(metro_data.get('lines', [])),
                "stations": len(metro_data.get('stations', []))
            }
            metro_history = metro_data.get('history', [])

    fallback = load_fallback_data()
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
        "environment": environment[::-1] if isinstance(environment, list) else [],
        "traffic": traffic[::-1] if isinstance(traffic, list) else [],
        "metro": metro_summary,
        "metroHistory": metro_history,
        "energy": fallback.get("energy", []),
        "transport": fallback.get("transport", []),
        "water": fallback.get("water", [])
    }

@app.post("/api/route")
async def get_route(req: RouteRequest):
    G = build_traffic_graph(req.mode)
    if not G: raise HTTPException(status_code=404, detail="Traffic data not available")
    
    try:
        start_node = find_nearest_node(G, req.start)
        end_node = find_nearest_node(G, req.end)
        
        if not start_node or not end_node:
            raise HTTPException(status_code=404, detail="Nearest graph nodes not found")
        
        # 1. Calculate Optimal Path
        path_opt = nx.shortest_path(G, source=start_node, target=end_node, weight='weight')
        
        # 2. Calculate Distance and Time for Optimal
        dist_km = 0
        for i in range(len(path_opt) - 1):
            p1, p2 = path_opt[i], path_opt[i+1]
            deg_dist = ((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**0.5
            dist_km += deg_dist * 111.0
        
        avg_speed = 35 if req.mode in ['car', 'bus'] else 15 if req.mode in ['bike', 'cycle'] else 5
        time_min = (dist_km / avg_speed) * 60 * 1.2 # Adjust for city factor
        
        # 3. Alternative Path (Simple approach: increase weights of optimal edges and re-calculate)
        G_alt = G.copy()
        for i in range(len(path_opt) - 1):
            u, v = path_opt[i], path_opt[i+1]
            if G_alt.has_edge(u, v):
                G_alt[u][v]['weight'] *= 2.0
        
        path_alt = nx.shortest_path(G_alt, source=start_node, target=end_node, weight='weight')
        
        dist_alt = 0
        for i in range(len(path_alt) - 1):
            p1, p2 = path_alt[i], path_alt[i+1]
            dist_alt += (((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**0.5) * 111.0
        
        time_alt = (dist_alt / avg_speed) * 60 * 1.3
        
        return {
            "optimal": {
                "path": path_opt,
                "distance": f"{dist_km:.2f} km",
                "time": f"{int(time_min)} min"
            },
            "alternative": {
                "path": path_alt,
                "distance": f"{dist_alt:.2f} km",
                "time": f"{int(time_alt)} min"
            },
            "mode": req.mode
        }
    except nx.NetworkXNoPath: raise HTTPException(status_code=404, detail="No path found")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
