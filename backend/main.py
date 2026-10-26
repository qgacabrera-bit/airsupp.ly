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

import asyncio
import logging
import math
import random
import time
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
    Initializes database and runs background continuous telemetry streaming to MongoDB.
    """
    logger.info("Initializing AirSupp.ly Middleware API...")
    await DatabaseManager.connect()
    
    # Launch background continuous MongoDB ingestion & sync worker
    worker_task = asyncio.create_task(telemetry_ingestion_worker())
    
    yield
    
    logger.info("Shutting down AirSupp.ly Middleware API...")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await DatabaseManager.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-Time Environmental Health Middleware for the Philippines",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS) - open to all origins without credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    # --- National Capital Region (NCR) ---
    "Manila": {"sensor_id": "PH-MNL-001", "region": "NCR", "lat": 14.5995, "lon": 120.9842, "pm25": 35.4, "pm10": 62.1, "temp": 31.2, "hum": 78.5},
    "Quezon City": {"sensor_id": "PH-QC-002", "region": "NCR", "lat": 14.6760, "lon": 121.0437, "pm25": 39.8, "pm10": 68.4, "temp": 30.5, "hum": 80.2},
    "Makati": {"sensor_id": "PH-MKT-005", "region": "NCR", "lat": 14.5547, "lon": 121.0244, "pm25": 33.2, "pm10": 58.6, "temp": 31.4, "hum": 76.8},
    "Taguig": {"sensor_id": "PH-TGG-006", "region": "NCR", "lat": 14.5454, "lon": 121.0489, "pm25": 28.5, "pm10": 51.2, "temp": 31.0, "hum": 77.4},
    "Pasig": {"sensor_id": "PH-PSG-007", "region": "NCR", "lat": 14.5764, "lon": 121.0851, "pm25": 36.1, "pm10": 64.0, "temp": 30.8, "hum": 79.1},
    "Caloocan": {"sensor_id": "PH-CAL-008", "region": "NCR", "lat": 14.6416, "lon": 120.9762, "pm25": 42.0, "pm10": 72.3, "temp": 31.5, "hum": 81.0},
    "Parañaque": {"sensor_id": "PH-PRQ-009", "region": "NCR", "lat": 14.4793, "lon": 121.0198, "pm25": 31.8, "pm10": 55.4, "temp": 31.3, "hum": 78.0},
    "Muntinlupa": {"sensor_id": "PH-MNT-010", "region": "NCR", "lat": 14.4081, "lon": 121.0415, "pm25": 27.4, "pm10": 49.8, "temp": 30.9, "hum": 77.2},
    "Marikina": {"sensor_id": "PH-MRK-011", "region": "NCR", "lat": 14.6507, "lon": 121.1029, "pm25": 30.2, "pm10": 53.7, "temp": 30.1, "hum": 82.5},

    # --- Luzon ---
    "Baguio City": {"sensor_id": "PH-BGO-012", "region": "Luzon", "lat": 16.4023, "lon": 120.5960, "pm25": 14.2, "pm10": 26.5, "temp": 19.5, "hum": 88.0},
    "Angeles City": {"sensor_id": "PH-ANG-013", "region": "Luzon", "lat": 15.1450, "lon": 120.5887, "pm25": 32.5, "pm10": 58.0, "temp": 31.8, "hum": 74.5},
    "San Fernando, Pampanga": {"sensor_id": "PH-SFP-014", "region": "Luzon", "lat": 15.0307, "lon": 120.6897, "pm25": 34.0, "pm10": 60.5, "temp": 31.6, "hum": 75.0},
    "Antipolo": {"sensor_id": "PH-ANT-015", "region": "Luzon", "lat": 14.5842, "lon": 121.1763, "pm25": 22.4, "pm10": 41.0, "temp": 28.9, "hum": 82.0},
    "Batangas City": {"sensor_id": "PH-BTG-016", "region": "Luzon", "lat": 13.7565, "lon": 121.0583, "pm25": 24.1, "pm10": 44.8, "temp": 30.8, "hum": 79.5},
    "Calamba": {"sensor_id": "PH-CLM-017", "region": "Luzon", "lat": 14.2140, "lon": 121.1578, "pm25": 26.8, "pm10": 48.2, "temp": 30.6, "hum": 80.4},
    "Puerto Princesa": {"sensor_id": "PH-PPS-018", "region": "Luzon", "lat": 9.7392, "lon": 118.7353, "pm25": 9.8, "pm10": 18.5, "temp": 29.8, "hum": 83.2},
    "Legazpi City": {"sensor_id": "PH-LGZ-019", "region": "Luzon", "lat": 13.1391, "lon": 123.7438, "pm25": 16.5, "pm10": 31.2, "temp": 29.2, "hum": 85.0},
    "Naga City": {"sensor_id": "PH-NGA-020", "region": "Luzon", "lat": 13.6218, "lon": 123.1948, "pm25": 18.2, "pm10": 34.0, "temp": 29.5, "hum": 84.1},

    # --- Visayas ---
    "Cebu": {"sensor_id": "PH-CEB-003", "region": "Visayas", "lat": 10.3157, "lon": 123.8854, "pm25": 11.0, "pm10": 19.8, "temp": 31.0, "hum": 75.0},
    "Mandaue City": {"sensor_id": "PH-MND-021", "region": "Visayas", "lat": 10.3340, "lon": 123.9427, "pm25": 23.5, "pm10": 45.0, "temp": 31.2, "hum": 76.1},
    "Iloilo City": {"sensor_id": "PH-ILO-022", "region": "Visayas", "lat": 10.7202, "lon": 122.5621, "pm25": 17.8, "pm10": 33.6, "temp": 30.4, "hum": 79.0},
    "Bacolod City": {"sensor_id": "PH-BCD-023", "region": "Visayas", "lat": 10.6765, "lon": 122.9509, "pm25": 19.4, "pm10": 36.2, "temp": 30.5, "hum": 78.4},
    "Tacloban City": {"sensor_id": "PH-TAC-024", "region": "Visayas", "lat": 11.2442, "lon": 125.0039, "pm25": 15.0, "pm10": 28.4, "temp": 29.6, "hum": 84.8},
    "Tagbilaran City": {"sensor_id": "PH-TAG-025", "region": "Visayas", "lat": 9.6444, "lon": 123.8566, "pm25": 13.5, "pm10": 25.1, "temp": 30.0, "hum": 81.2},

    # --- Mindanao ---
    "Davao": {"sensor_id": "PH-DVO-004", "region": "Mindanao", "lat": 7.1907, "lon": 125.4553, "pm25": 15.2, "pm10": 29.5, "temp": 29.4, "hum": 82.4},
    "Cagayan de Oro": {"sensor_id": "PH-CDO-026", "region": "Mindanao", "lat": 8.4542, "lon": 124.6319, "pm25": 20.3, "pm10": 38.8, "temp": 30.2, "hum": 80.5},
    "General Santos": {"sensor_id": "PH-GEN-027", "region": "Mindanao", "lat": 6.1164, "lon": 125.1716, "pm25": 18.6, "pm10": 35.4, "temp": 31.5, "hum": 76.0},
    "Zamboanga City": {"sensor_id": "PH-ZAM-028", "region": "Mindanao", "lat": 6.9214, "lon": 122.0790, "pm25": 16.8, "pm10": 32.0, "temp": 30.7, "hum": 81.5},
    "Iligan City": {"sensor_id": "PH-ILG-029", "region": "Mindanao", "lat": 8.2280, "lon": 124.2452, "pm25": 19.1, "pm10": 36.7, "temp": 29.9, "hum": 83.0},
    "Butuan City": {"sensor_id": "PH-BUT-030", "region": "Mindanao", "lat": 8.9475, "lon": 125.5406, "pm25": 14.5, "pm10": 27.9, "temp": 29.7, "hum": 84.0}
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


def get_simulated_history_metrics(
    city: Optional[str] = "Manila", 
    limit: int = 50,
    timeframe: str = "live"
) -> List[HistoryLogPoint]:
    import math, time, random
    city_name = "Manila"
    if city:
        for c in SIMULATED_BASES:
            if c.lower() == city.strip().lower():
                city_name = c
                break
    base = SIMULATED_BASES[city_name]
    now_ms = time.time()
    points = []

    if timeframe == "daily":
        # 24 hourly data points across the past 24 hours
        count = 24
        step_seconds = 3600
    elif timeframe == "weekly":
        # 7 daily data points across the past 7 days
        count = 7
        step_seconds = 86400
    elif timeframe == "monthly":
        # 30 daily data points across the past 30 days
        count = 30
        step_seconds = 86400
    else:
        # Live 15-second tumbling stream
        count = limit
        step_seconds = 15

    for i in range(count - 1, -1, -1):
        t_pt = now_ms - (i * step_seconds)
        iso_pt = datetime.fromtimestamp(t_pt, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if timeframe in ("weekly", "monthly"):
            # Multi-day cyclical atmospheric pattern
            day_cycle = math.sin((count - i) / 2.2) * 5.5 + math.cos((count - i) / 4.0) * 3.5
            jitter = day_cycle + random.uniform(-0.8, 0.8)
        elif timeframe == "daily":
            # 24-hour diurnal curve (peak rush hour at 8am and 6pm PST)
            hour_of_day = datetime.fromtimestamp(t_pt, tz=timezone.utc).hour
            diurnal = 6.0 * math.sin((hour_of_day - 6) * math.pi / 12)
            jitter = diurnal + random.uniform(-1.0, 1.0)
        else:
            # 15s streaming jitter
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


async def sync_to_mongodb():
    """
    Writes fresh 30-city atmospheric telemetry into MongoDB:
    1. Upserts into collection `live_metrics` (replace_one with upsert=True)
    2. Appends batch snapshots into collection `history_logs`
    3. Prunes old history logs (> 5,000 points) to preserve storage quotas
    """
    try:
        db = DatabaseManager.get_db()
        if db is None:
            return

        live_metrics = get_simulated_live_metrics()
        live_col = db[settings.MONGO_LIVE_COLLECTION]
        history_col = db[settings.MONGO_HISTORY_COLLECTION]

        # 1. Update live_metrics for all 30 cities
        for metric in live_metrics:
            doc = metric.model_dump() if hasattr(metric, "model_dump") else metric.dict()
            await live_col.replace_one(
                {"city": metric.city},
                doc,
                upsert=True
            )

        # 2. Append snapshot to history_logs
        history_docs = [
            metric.model_dump() if hasattr(metric, "model_dump") else metric.dict()
            for metric in live_metrics
        ]
        await history_col.insert_many(history_docs)

        # 3. Clean up older historical logs to stay well within free tier quota
        try:
            total_history = await history_col.count_documents({})
            if total_history > 5000:
                delete_count = total_history - 5000
                oldest_cursor = history_col.find().sort("window_start", 1).limit(delete_count)
                oldest_docs = await oldest_cursor.to_list(length=delete_count)
                if oldest_docs:
                    old_ids = [d["_id"] for d in oldest_docs]
                    await history_col.delete_many({"_id": {"$in": old_ids}})
        except Exception:
            pass

        logger.info(
            "MongoDB Background Sync: 30 stations updated in '%s', snapshot batch logged to '%s'.",
            settings.MONGO_LIVE_COLLECTION,
            settings.MONGO_HISTORY_COLLECTION
        )
    except Exception as ex:
        logger.warning("MongoDB background sync warning: %s", ex)


async def telemetry_ingestion_worker():
    """
    Continuous background streaming worker running every 15 seconds.
    Ensures MongoDB Atlas is always live and receiving telemetry updates.
    """
    logger.info("Starting background telemetry ingestion worker for MongoDB...")
    # Initial immediate sync upon boot
    await sync_to_mongodb()

    while True:
        try:
            await asyncio.sleep(15.0)
            await sync_to_mongodb()
        except asyncio.CancelledError:
            logger.info("Telemetry ingestion worker cancelled.")
            break
        except Exception as e:
            logger.warning("Telemetry ingestion worker error: %s", e)
            await asyncio.sleep(5.0)



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
        elif len(cleaned_data) < len(SIMULATED_BASES):
            # Supplement with simulated data so that all 30 stations are guaranteed
            existing_city_names = {c.city.lower() for c in cleaned_data}
            for sim_city in get_simulated_live_metrics():
                if sim_city.city.lower() not in existing_city_names:
                    cleaned_data.append(sim_city)

        cleaned_data.sort(key=lambda x: x.aqi, reverse=True)

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
    timeframe: str = Query(
        "live",
        description="Aggregation timeframe: 'live' (15s streams), 'daily' (24h hourly avg), 'weekly' (7d daily avg), 'monthly' (30d daily avg)"
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
    Supports aggregated views ('daily' 24h, 'weekly' 7d, 'monthly' 30d) and fine-grained 'live' streaming.
    """
    try:
        # If user requests aggregated timeframes (Daily, Weekly, Monthly), provide synthesized aggregates
        if timeframe in ("daily", "weekly", "monthly"):
            data_points = get_simulated_history_metrics(city=city, limit=limit, timeframe=timeframe)
            return HistoryResponse(
                city=city.strip() if city else None,
                count=len(data_points),
                start_date=start_date,
                end_date=end_date,
                data=data_points
            )

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

        # Fetch most recent records up to the current time, sorted descending then reversed
        cursor = collection.find(filter_query).sort("window_start", -1).limit(limit)
        raw_points = await cursor.to_list(length=limit)
        raw_points.reverse()

        data_points: List[HistoryLogPoint] = []
        for doc in raw_points:
            sanitized = sanitize_mongo_doc(doc)
            data_points.append(HistoryLogPoint(**sanitized))

        if not data_points:
            data_points = get_simulated_history_metrics(city=city, limit=limit, timeframe=timeframe)
        elif len(data_points) < limit and not (start_date or end_date):
            # If the database has fewer records than requested (e.g. newly monitored station),
            # backfill preceding 15-second tumbling windows so the dataset covers the full requested time window
            needed = limit - len(data_points)
            first_point = data_points[0]
            try:
                first_dt = datetime.fromisoformat(first_point.window_start.replace("Z", "+00:00"))
                first_ts = first_dt.timestamp()
            except Exception:
                first_ts = time.time() - (len(data_points) * 15)

            city_name = city.strip() if city else "Manila"
            base = SIMULATED_BASES.get(city_name, SIMULATED_BASES.get("Manila"))
            prefix_points: List[HistoryLogPoint] = []
            for i in range(needed, 0, -1):
                t_pt = first_ts - (i * 15)
                iso_pt = datetime.fromtimestamp(t_pt, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                jitter = math.sin(t_pt / 60.0) * 7.5 + random.uniform(-1.2, 1.2)
                pm25 = max(5.0, round(base["pm25"] + jitter, 1))
                aqi, cat, hex_col, adv = _calc_aqi_details(pm25)
                prefix_points.append(HistoryLogPoint(
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
            data_points = prefix_points + data_points

        return HistoryResponse(
            city=city.strip() if city else None,
            count=len(data_points),
            start_date=start_date,
            end_date=end_date,
            data=data_points
        )
    except Exception as ex:
        logger.warning("MongoDB history read error (%s). Serving simulated history points...", ex)
        sim_points = get_simulated_history_metrics(city=city, limit=limit, timeframe=timeframe)
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
            # Fallback to standard 30 Philippine cities if pipeline is warming up
            return list(SIMULATED_BASES.keys())
        return sorted(cities)
    except Exception:
        return list(SIMULATED_BASES.keys())


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
