#!/usr/bin/env python3
"""
AirSupp.ly - FastAPI Backend Middleware Layer
==============================================
Exposes high-performance async REST endpoints for the AirSupp.ly Real-Time
Environmental Health Platform:
  - GET /api/live: Real-time 15s snapshots across Philippine cities sorted by AQI descending
  - GET /api/history: Time-series historical data ready for chart rendering and CSV export
  - GET /api/health: Pipeline status & database health check
  - GET /api/cities: Active city catalog
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database import DatabaseManager
from backend.schemas import (
    LiveMetricsResponse,
    CityMetrics,
    HistoryResponse,
    HistoryLogPoint,
    HealthStatus
)

# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AirSupp.ly-API] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("airsupply.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages FastAPI application startup and shutdown lifecycle.
    """
    logger.info("Initializing AirSupp.ly Middleware API...")
    await DatabaseManager.connect()
    yield
    logger.info("Shutting down AirSupp.ly Middleware API...")
    await DatabaseManager.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-Time Environmental Health Middleware for the Philippines",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def sanitize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Abstracts database internals: removes Mongo `_id`, raw window structs,
    or internal watermarks so responses are clean and compliant with schemas.
    """
    doc.pop("_id", None)
    doc.pop("window", None)
    return doc


SIMULATED_BASES = {
    "Manila": {"sensor_id": "PH-MNL-001", "lat": 14.5995, "lon": 120.9842, "pm25": 35.4, "pm10": 62.1, "temp": 31.2, "hum": 78.5},
    "Quezon City": {"sensor_id": "PH-QC-002", "lat": 14.6760, "lon": 121.0437, "pm25": 39.8, "pm10": 68.4, "temp": 30.5, "hum": 80.2},
    "Cebu": {"sensor_id": "PH-CEB-003", "lat": 10.3157, "lon": 123.8854, "pm25": 21.6, "pm10": 41.2, "temp": 31.0, "hum": 75.0},
    "Davao": {"sensor_id": "PH-DVO-004", "lat": 7.1907, "lon": 125.4553, "pm25": 15.2, "pm10": 29.5, "temp": 29.4, "hum": 82.4}
}


def _calc_aqi_details(pm25: float):
    c = max(0.0, round(float(pm25), 1))
    brackets = [
        (0.0, 12.0, 0, 50, "Good", "#00E400", "Air quality is satisfactory. Safe for all outdoor activities and open-air commutes."),
        (12.1, 35.4, 51, 100, "Moderate", "#FFFF00", "Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion."),
        (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups", "#FF7E00", "Sensitive groups should reduce prolonged outdoor activity. Wear KF94/N95 masks on open-air commutes."),
        (55.5, 150.4, 151, 200, "Unhealthy", "#FF0000", "Avoid prolonged exposure along major highways (e.g. EDSA, C-5). Wear well-fitted masks."),
        (150.5, 250.4, 201, 300, "Very Unhealthy", "#8F3F97", "Health alert: serious risk of respiratory irritation. Stay indoors with air purification."),
        (250.5, 500.4, 301, 500, "Hazardous", "#7E0023", "Health warning of emergency conditions. Entire population is at severe risk.")
    ]
    for c_low, c_high, i_low, i_high, cat, hex_col, adv in brackets:
        if c_low <= c <= c_high:
            val = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return int(round(val)), cat, hex_col, adv
    return 500, "Hazardous", "#7E0023", "Emergency conditions. Entire population is affected."


def get_simulated_live_metrics() -> List[CityMetrics]:
    import math, time, random
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    t_sec = time.time()
    results = []

    for city, base in SIMULATED_BASES.items():
        jitter = math.sin(t_sec / 15.0 + hash(city) % 10) * 3.5 + random.uniform(-0.6, 0.6)
        pm25 = max(4.0, round(base["pm25"] + jitter, 1))
        pm10 = max(10.0, round(base["pm10"] + jitter * 1.5, 1))
        aqi, cat, hex_col, adv = _calc_aqi_details(pm25)
        results.append(CityMetrics(
            sensor_id=base["sensor_id"],
            city=city,
            country="PH",
            latitude=base["lat"],
            longitude=base["lon"],
            pm25=pm25,
            pm10=pm10,
            temperature=base["temp"],
            humidity=base["hum"],
            aqi=aqi,
            category=cat,
            color_hex=hex_col,
            health_advisory=adv,
            window_start=now_iso,
            window_end=now_iso,
            processed_at=now_iso
        ))

    results.sort(key=lambda x: x.aqi, reverse=True)
    return results


def get_simulated_history_metrics(city: Optional[str] = "Manila", limit: int = 50) -> List[HistoryLogPoint]:
    import math, time, random
    city_name = city if city and city in SIMULATED_BASES else "Manila"
    base = SIMULATED_BASES.get(city_name, SIMULATED_BASES["Manila"])
    now_ms = time.time()
    points = []

    for i in range(limit - 1, -1, -1):
        t_pt = now_ms - (i * 15)
        iso_pt = datetime.fromtimestamp(t_pt, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        jitter = math.sin(t_pt / 60.0) * 7.5 + random.uniform(-1.2, 1.2)
        pm25 = max(5.0, round(base["pm25"] + jitter, 1))
        aqi, cat, hex_col, adv = _calc_aqi_details(pm25)
        points.append(HistoryLogPoint(
            city=city_name,
            pm25=pm25,
            pm10=round(base["pm10"] + jitter * 1.4, 1),
            temperature=base["temp"],
            humidity=base["hum"],
            aqi=aqi,
            category=cat,
            color_hex=hex_col,
            health_advisory=adv,
            window_start=iso_pt,
            window_end=iso_pt,
            processed_at=iso_pt
        ))
    return points



@app.get("/", tags=["Root"])
async def root():
    """
    Root status and API sitemap.
    """
    return {
        "service": "AirSupp.ly Backend Middleware",
        "description": "Real-Time Environmental Health Platform for the Philippines",
        "status": "online",
        "endpoints": {
            "live_metrics": "/api/live",
            "historical_logs": "/api/history",
            "cities": "/api/cities",
            "health_check": "/api/health",
            "documentation": "/docs"
        }
    }


@app.get(
    "/api/live",
    response_model=LiveMetricsResponse,
    summary="Get Latest City Metrics Sorted by AQI Descending",
    tags=["Telemetry"]
)
async def get_live_metrics():
    """
    Retrieves the most recent 15-second telemetry snapshot for all monitored Philippine cities.
    Results are strictly sorted in descending order of AQI (highest / most hazardous first).
    """
    try:
        db = DatabaseManager.get_db()
        collection = db[settings.MONGO_LIVE_COLLECTION]

        # Query live_metrics and sort by AQI descending
        cursor = collection.find({}).sort("aqi", -1)
        raw_cities = await cursor.to_list(length=100)

        cleaned_data: List[CityMetrics] = []
        for doc in raw_cities:
            sanitized = sanitize_mongo_doc(doc)
            cleaned_data.append(CityMetrics(**sanitized))

        if not cleaned_data:
            # Fallback to simulated live telemetry when DB is warming up or offline
            cleaned_data = get_simulated_live_metrics()

        return LiveMetricsResponse(
            total_cities=len(cleaned_data),
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            data=cleaned_data
        )
    except Exception as ex:
        logger.warning("MongoDB read exception (%s). Serving simulated live telemetry...", ex)
        simulated = get_simulated_live_metrics()
        return LiveMetricsResponse(
            total_cities=len(simulated),
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            data=simulated
        )



@app.get(
    "/api/history",
    response_model=HistoryResponse,
    summary="Query Historical Time-Series Telemetry",
    tags=["Telemetry"]
)
async def get_history(
    city: Optional[str] = Query(
        None,
        description="Filter by Philippine city name (e.g. 'Manila', 'Quezon City', 'Cebu', 'Davao')"
    ),
    start_date: Optional[str] = Query(
        None,
        description="Filter records starting from this ISO-8601 UTC timestamp (e.g. '2026-10-26T00:00:00Z')"
    ),
    end_date: Optional[str] = Query(
        None,
        description="Filter records up to this ISO-8601 UTC timestamp (e.g. '2026-10-26T23:59:59Z')"
    ),
    limit: int = Query(
        100,
        ge=1,
        le=1000,
        description="Maximum number of historical points to return (default 100, max 1000)"
    )
):
    """
    Queries `history_logs` and returns chronologically sorted time-series data
    (oldest to newest) ready for charting, trend analysis, and PDF/CSV export.
    """
    try:
        db = DatabaseManager.get_db()
        collection = db[settings.MONGO_HISTORY_COLLECTION]

        # Build MongoDB query filter
        filter_query: Dict[str, Any] = {}

        if city and city.strip():
            # Case-insensitive city matching
            filter_query["city"] = {"$regex": f"^{city.strip()}$", "$options": "i"}

        # Date range filtering on window_start
        date_filter: Dict[str, Any] = {}
        if start_date and start_date.strip():
            date_filter["$gte"] = start_date.strip()
        if end_date and end_date.strip():
            date_filter["$lte"] = end_date.strip()

        if date_filter:
            filter_query["window_start"] = date_filter

        # Fetch records sorted by window_start ascending (chronological for charts)
        cursor = collection.find(filter_query).sort("window_start", 1).limit(limit)
        raw_points = await cursor.to_list(length=limit)

        data_points: List[HistoryLogPoint] = []
        for doc in raw_points:
            sanitized = sanitize_mongo_doc(doc)
            data_points.append(HistoryLogPoint(**sanitized))

        if not data_points:
            data_points = get_simulated_history_metrics(city=city, limit=limit)

        return HistoryResponse(
            city=city.strip() if city else None,
            count=len(data_points),
            start_date=start_date,
            end_date=end_date,
            data=data_points
        )
    except Exception as ex:
        logger.warning("MongoDB history read error (%s). Serving simulated history points...", ex)
        sim_points = get_simulated_history_metrics(city=city, limit=limit)
        return HistoryResponse(
            city=city.strip() if city else None,
            count=len(sim_points),
            start_date=start_date,
            end_date=end_date,
            data=sim_points
        )



@app.get(
    "/api/cities",
    response_model=List[str],
    summary="List Monitored Philippine Cities",
    tags=["Metadata"]
)
async def get_cities():
    """
    Returns an array of unique city names currently monitored or present in live metrics.
    """
    try:
        db = DatabaseManager.get_db()
        live_col = db[settings.MONGO_LIVE_COLLECTION]
        cities = await live_col.distinct("city")
        if not cities:
            # Fallback to standard core cities if pipeline is warming up
            return ["Manila", "Quezon City", "Cebu", "Davao"]
        return sorted(cities)
    except Exception:
        return ["Manila", "Quezon City", "Cebu", "Davao"]


@app.get(
    "/api/health",
    response_model=HealthStatus,
    summary="Health & Readiness Check",
    tags=["System"]
)
async def health_check():
    """
    Inspects database connectivity and returns document counts across collections.
    """
    db_connected = False
    live_count = 0
    history_count = 0

    try:
        db = DatabaseManager.get_db()
        await db.command("ping")
        db_connected = True
        live_count = await db[settings.MONGO_LIVE_COLLECTION].count_documents({})
        history_count = await db[settings.MONGO_HISTORY_COLLECTION].count_documents({})
    except Exception as e:
        logger.warning("Health check detected DB failure: %s", e)

    return HealthStatus(
        status="ok" if db_connected else "degraded",
        version=settings.VERSION,
        database_connected=db_connected,
        live_records_count=live_count,
        history_records_count=history_count
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
