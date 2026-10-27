"""
EduPulse — Student Learning Analytics & Data Warehouse
FastAPI Main Application Entrypoint.
"""

import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure app is discoverable on python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.endpoints import router as api_router

app = FastAPI(
    title="EduPulse Analytics API",
    description="Student Learning Analytics & Data Warehouse API Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite Frontend and Cloudflare Tunnels
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "service": "EduPulse Analytics API",
        "status": "ONLINE",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "/api/filters/options",
            "/api/analytics/overview",
            "/api/analytics/courses",
            "/api/analytics/attendance",
            "/api/analytics/credits",
            "/api/analytics/early-warning",
            "/api/metadata/data-dictionary",
            "/api/etl/status",
            "/api/etl/rejections"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
