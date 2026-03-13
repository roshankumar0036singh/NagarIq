from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI(title="Smart City Data Analyzer API", description="API for Smart City Dashboard endpoints.")

# Allow CORS for local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "city_data.json")

def load_data():
    if not os.path.exists(DATA_FILE):
        raise HTTPException(status_code=404, detail="Data file not found")
    with open(DATA_FILE, "r") as f:
        return json.load(f)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart City Data Analyzer API"}

@app.get("/api/overview")
def get_overview():
    data = load_data()
    return data.get("kpis", {})

@app.get("/api/metrics/{category}")
def get_metrics(category: str):
    data = load_data()
    if category in data:
        return data[category]
    raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

@app.get("/api/all-metrics")
def get_all_metrics():
    return load_data()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
