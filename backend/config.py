"""
AirSupp.ly - Backend Configuration
==================================
Manages configuration and environment settings for FastAPI middleware.
"""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "AirSupp.ly Environmental Health Middleware API"
    VERSION: str = "1.0.0"
    HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "airsupply_db")
    MONGO_LIVE_COLLECTION: str = os.getenv("MONGO_LIVE_COLLECTION", "live_metrics")
    MONGO_HISTORY_COLLECTION: str = os.getenv("MONGO_HISTORY_COLLECTION", "history_logs")

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]


settings = Settings()
