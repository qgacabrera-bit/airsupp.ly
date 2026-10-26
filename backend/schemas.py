"""
AirSupp.ly - Pydantic Response & Request Schemas
=================================================
Defines strict data models that abstract MongoDB internals (_id, raw metadata)
and enforce high-performance validation for frontend charts, tables, and exports.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CityMetrics(BaseModel):
    """
    Standardized atmospheric telemetry and environmental health snapshot for a city.
    """
    sensor_id: str = Field(..., description="Unique hardware or virtual station identifier", example="PH-MNL-001")
    city: str = Field(..., description="Philippine city name", example="Manila")
    country: str = Field(default="PH", description="ISO 3166-1 alpha-2 country code", example="PH")
    latitude: float = Field(..., description="Geographic latitude coordinate", example=14.5995)
    longitude: float = Field(..., description="Geographic longitude coordinate", example=120.9842)
    pm25: float = Field(..., description="Fine particulate matter concentration in ug/m3", example=35.4)
    pm10: float = Field(..., description="Inhalable coarse particulate matter in ug/m3", example=62.1)
    temperature: float = Field(..., description="Ambient temperature in degrees Celsius", example=31.2)
    humidity: float = Field(..., description="Relative humidity percentage", example=78.5)
    aqi: int = Field(..., description="Standardized Air Quality Index (0-500)", example=101)
    category: str = Field(..., description="DENR/EPA AQI Category", example="Unhealthy for Sensitive Groups")
    color_hex: str = Field(..., description="Official AQI hex color code", example="#FF7E00")
    health_advisory: str = Field(..., description="Actionable health and commute guidance", example="Wear KF94/N95 masks on open-air commutes.")
    window_start: str = Field(..., description="ISO UTC start timestamp of the 15-second tumbling window")
    window_end: str = Field(..., description="ISO UTC end timestamp of the 15-second tumbling window")
    processed_at: Optional[str] = Field(None, description="ISO UTC timestamp when Spark processed the batch")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "sensor_id": "PH-MNL-001",
                "city": "Manila",
                "country": "PH",
                "latitude": 14.5995,
                "longitude": 120.9842,
                "pm25": 38.2,
                "pm10": 64.0,
                "temperature": 31.0,
                "humidity": 78.0,
                "aqi": 108,
                "category": "Unhealthy for Sensitive Groups",
                "color_hex": "#FF7E00",
                "health_advisory": "Sensitive groups should reduce prolonged outdoor exertion. Recommended to wear KF94/N95 masks on open-air jeepney/tricycle commutes.",
                "window_start": "2026-10-26T13:15:00Z",
                "window_end": "2026-10-26T13:15:15Z",
                "processed_at": "2026-10-26T13:15:16Z"
            }
        }
    }


class LiveMetricsResponse(BaseModel):
    """
    Response schema for GET /api/live
    """
    total_cities: int = Field(..., description="Count of active Philippine cities in stream")
    timestamp: str = Field(..., description="Server response time in UTC ISO-8601")
    data: List[CityMetrics] = Field(..., description="List of city metrics sorted by AQI descending")


class HistoryLogPoint(BaseModel):
    """
    Individual chronological data point for charts, time-series visualization, and CSV export.
    """
    city: str
    pm25: float
    pm10: float
    temperature: float
    humidity: float
    aqi: int
    category: str
    color_hex: str
    health_advisory: str
    window_start: str
    window_end: str
    processed_at: Optional[str] = None


class HistoryResponse(BaseModel):
    """
    Response schema for GET /api/history
    """
    city: Optional[str] = Field(None, description="Queried city or 'ALL'")
    count: int = Field(..., description="Number of historical time-series points returned")
    start_date: Optional[str] = Field(None, description="Start date filter applied")
    end_date: Optional[str] = Field(None, description="End date filter applied")
    data: List[HistoryLogPoint] = Field(..., description="Chronologically sorted historical data points (oldest to newest)")


class HealthStatus(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    database_connected: bool
    live_records_count: int
    history_records_count: int
