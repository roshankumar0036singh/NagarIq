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
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "city_data.json")
TRAFFIC_DATA_PATH = os.path.join(os.path.dirname(__file__), "../frontend/public/data/live_traffic.json")
METRO_DATA_PATH = os.path.join(os.path.dirname(__file__), "../frontend/public/data/metro_data.json")
EMERGENCY_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "emergency_resources.json")

class RouteRequest(BaseModel):
    start: Tuple[float, float] # [lon, lat]
    end: Tuple[float, float]
    mode: str # 'car', 'bike', 'cycle', 'pedestrian'

class EmergencyRouteRequest(BaseModel):
    incident: Tuple[float, float] # [lon, lat]
    type: str # 'medical', 'fire', 'all'

class AIQueryRequest(BaseModel):
    query: str

class MultiModalRouteRequest(BaseModel):
    start: Tuple[float, float]
    end: Tuple[float, float]

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

@app.get("/api/grievances")
async def get_grievances():
    grievances_path = os.path.join(os.path.dirname(__file__), "data", "grievances.json")
    if not os.path.exists(grievances_path):
        raise HTTPException(status_code=404, detail="Grievances data not available")
    with open(grievances_path, "r") as f:
        return json.load(f)

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

@app.post("/api/emergency-route")
async def get_emergency_route(req: EmergencyRouteRequest):
    if not os.path.exists(EMERGENCY_DATA_PATH):
        raise HTTPException(status_code=404, detail="Emergency resources data not found")
    
    with open(EMERGENCY_DATA_PATH, "r") as f:
        resources = json.load(f)["resources"]
    
    # Filter by type if needed
    if req.type == 'medical':
        targets = [r for r in resources if r['type'] == 'hospital']
    elif req.type == 'fire':
        targets = [r for r in resources if r['type'] == 'fire_station']
    else:
        targets = resources

    if not targets:
        raise HTTPException(status_code=404, detail="No resources of this type available")

    # 1. Find the Nearest Resource (Euclidean for simplicity first)
    nearest = min(targets, key=lambda t: (t['position'][0]-req.incident[0])**2 + (t['position'][1]-req.incident[1])**2)
    
    # 2. Build Graph (Emergency vehicles use 'car' roads but ignore congestion penalties)
    # We want the FASTEST path, so we use distance as base and IGNORE live congestion
    # because they have right of way
    G = build_traffic_graph('car') 
    if not G: raise HTTPException(status_code=404, detail="Traffic data not available")

    try:
        start_node = find_nearest_node(G, nearest['position'])
        end_node = find_nearest_node(G, req.incident)
        
        if not start_node or not end_node:
            raise HTTPException(status_code=404, detail="Nearest graph nodes not found")
        
        # Emergency path uses weight='weight_emergency' or just dist
        # Let's add weight_emergency which ignores congestion but keeps distance
        for u, v, data in G.edges(data=True):
            data['emergency_weight'] = ((u[0]-v[0])**2 + (u[1]-v[1])**2)**0.5

        path = nx.shortest_path(G, source=start_node, target=end_node, weight='emergency_weight')
        
        dist_km = 0
        for i in range(len(path) - 1):
            p1, p2 = path[i], path[i+1]
            dist_km += (((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**0.5) * 111.0
        
        # High speed for emergency vehicles
        avg_speed = 50 
        time_min = (dist_km / avg_speed) * 60

        return {
            "path": path,
            "source": nearest,
            "distance": f"{dist_km:.2f} km",
            "time": f"{int(time_min)} min"
        }
    except nx.NetworkXNoPath: raise HTTPException(status_code=404, detail="No path found")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ask-ai")
async def ask_ai(req: AIQueryRequest):
    if not MISTRAL_API_KEY:
        raise HTTPException(status_code=503, detail="Mistral API key not configured")
        
    metrics = await get_all_metrics()
    
    system_prompt = f"""You are NagarIQ AI, an intelligent assistant for a Smart City dashboard. 
You provide insights based on real-time city data. Be concise, helpful, and format your response in markdown.

Current City Metrics Overview:
{json.dumps(metrics.get("kpis", {}), indent=2)}

Metro Status:
{json.dumps(metrics.get("metro", {}), indent=2)}

Recent Environmental Data (AQI, PM2.5, Temp):
{json.dumps(metrics.get("environment", [])[:2], indent=2)}

Recent Traffic Data (Congestion, Speed):
{json.dumps(metrics.get("traffic", [])[:2], indent=2)}
"""

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "mistral-large-latest",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.query}
        ]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                answer = data["choices"][0]["message"]["content"]
                return {"answer": answer}
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Mistral API error: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Mistral AI: {str(e)}")

@app.post("/api/multi-modal-route")
async def get_multi_modal_route(req: MultiModalRouteRequest):
    if not os.path.exists(METRO_DATA_PATH):
        raise HTTPException(status_code=404, detail="Metro data not available")
    
    with open(METRO_DATA_PATH, "r") as f:
        metro_data = json.load(f)
    
    stations = metro_data.get('stations', [])
    if not stations:
        raise HTTPException(status_code=404, detail="No metro stations found")

    # 1. Find Nearest Stations
    entry_station = min(stations, key=lambda s: (s['coords'][0]-req.start[0])**2 + (s['coords'][1]-req.start[1])**2)
    exit_station = min(stations, key=lambda s: (s['coords'][0]-req.end[0])**2 + (s['coords'][1]-req.end[1])**2)

    # 2. Road Graphs
    G_car = build_traffic_graph('car')
    G_walk = build_traffic_graph('pedestrian')
    
    if not G_car or not G_walk:
        raise HTTPException(status_code=500, detail="Traffic graphs could not be built")

    try:
        # Segment 1: Start -> Entry Station (Car)
        start_node = find_nearest_node(G_car, req.start)
        entry_node = find_nearest_node(G_car, entry_station['coords'])
        path1 = nx.shortest_path(G_car, source=start_node, target=entry_node, weight='weight')
        dist1_km = sum((((path1[i][0]-path1[i+1][0])**2 + (path1[i][1]-path1[i+1][1])**2)**0.5) for i in range(len(path1)-1)) * 111.0
        time1_min = (dist1_km / 35.0) * 60 * 1.2

        # Segment 2: Entry Station -> Exit Station (Metro)
        path2 = [entry_station['coords'], exit_station['coords']]
        dist2_km = (((entry_station['coords'][0]-exit_station['coords'][0])**2 + (entry_station['coords'][1]-exit_station['coords'][1])**2)**0.5) * 111.0
        time2_min = (dist2_km / 40.0) * 60 + 5 

        # Segment 3: Exit Station -> End (Walk)
        exit_node_walk = find_nearest_node(G_walk, exit_station['coords'])
        end_node_walk = find_nearest_node(G_walk, req.end)
        path3 = nx.shortest_path(G_walk, source=exit_node_walk, target=end_node_walk, weight='weight')
        dist3_km = sum((((path3[i][0]-path3[i+1][0])**2 + (path3[i][1]-path3[i+1][1])**2)**0.5) for i in range(len(path3)-1)) * 111.0
        time3_min = (dist3_km / 5.0) * 60

        # 3. Pure Driving Route for Comparison
        drive_start = find_nearest_node(G_car, req.start)
        drive_end = find_nearest_node(G_car, req.end)
        path_drive = nx.shortest_path(G_car, source=drive_start, target=drive_end, weight='weight')
        dist_drive_km = sum((((path_drive[i][0]-path_drive[i+1][0])**2 + (path_drive[i][1]-path_drive[i+1][1])**2)**0.5) for i in range(len(path_drive)-1)) * 111.0
        time_drive_min = (dist_drive_km / 30.0) * 60 * 1.3

        co2_multi = (dist1_km * 170) + (dist2_km * 20)
        co2_drive = (dist_drive_km * 170)
        
        cost_multi = (dist1_km * 10) + (dist2_km * 2) + 10 
        cost_drive = (dist_drive_km * 10)

        return {
            "multiModal": {
                "segments": [
                    {"mode": "car", "path": path1, "distance": f"{dist1_km:.2f} km", "time": f"{int(time1_min)} min"},
                    {"mode": "metro", "path": path2, "distance": f"{dist2_km:.2f} km", "time": f"{int(time2_min)} min", "station": entry_station['name']},
                    {"mode": "walk", "path": path3, "distance": f"{dist3_km:.2f} km", "time": f"{int(time3_min)} min"}
                ],
                "totalTime": f"{int(time1_min + time2_min + time3_min)} min",
                "totalDistance": f"{dist1_km + dist2_km + dist3_km:.2f} km",
                "co2": f"{co2_multi/1000:.2f} kg",
                "cost": f"₹{int(cost_multi)}"
            },
            "drivingComparison": {
                "path": path_drive,
                "totalTime": f"{int(time_drive_min)} min",
                "totalDistance": f"{dist_drive_km:.2f} km",
                "co2": f"{co2_drive/1000:.2f} kg",
                "cost": f"₹{int(cost_drive)}"
            },
            "savings": {
                "co2": f"{(co2_drive - co2_multi)/1000:.2f} kg",
                "cost": f"₹{int(cost_drive - cost_multi)}",
                "time": f"{int(time_drive_min - (time1_min + time2_min + time3_min))} min"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
