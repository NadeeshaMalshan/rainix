from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
import pandas as pd
import json
import os

app = FastAPI(title="Rainix AI Backend")

# Allow requests from any origin (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "river_level_ridge_model.joblib"
FEATURES_PATH = "model_features.json"

@app.get("/")
def root():
    return {"message": "Welcome to Rainix AI River Flood Prediction API!"}

@app.get("/predict")
def predict_river_level():
    # Idiriyedi api methanata data fetch wena code eka liyanawa
    return {"message": "Prediction endpoint coming soon!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
