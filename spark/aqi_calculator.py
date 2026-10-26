"""
AirSupp.ly - Dynamic AQI Calculation Engine
============================================
Implements standard US EPA and Philippine DENR PM2.5 breakpoint algorithms
to dynamically compute AQI, descriptive category, official hex color code,
and localized Philippine health advisories.
"""

from typing import Dict, Any, Tuple
try:
    from pyspark.sql.types import StructType, StructField, IntegerType, StringType
    from pyspark.sql.functions import udf
    PYSPARK_AVAILABLE = True
    AQI_STRUCT_SCHEMA = StructType([
        StructField("aqi", IntegerType(), nullable=False),
        StructField("category", StringType(), nullable=False),
        StructField("color_hex", StringType(), nullable=False),
        StructField("health_advisory", StringType(), nullable=False),
    ])
except ImportError:
    PYSPARK_AVAILABLE = False
    AQI_STRUCT_SCHEMA = None

# PM2.5 Breakpoints: (C_low, C_high, I_low, I_high, category, hex_code, advisory)
BREAKPOINTS = [
    (
        0.0, 12.0, 0, 50,
        "Good",
        "#00E400",
        "Air quality is satisfactory and poses little to no risk. Safe for all outdoor activities and open-air commutes."
    ),
    (
        12.1, 35.4, 51, 100,
        "Moderate",
        "#FFFF00",
        "Air quality is acceptable. Unusually sensitive individuals should limit prolonged outdoor exertion along busy road corridors."
    ),
    (
        35.5, 55.4, 101, 150,
        "Unhealthy for Sensitive Groups",
        "#FF7E00",
        "Sensitive groups (asthmatics, elderly, children) should reduce prolonged outdoor exertion. Recommended to wear KF94/N95 masks on open-air jeepney/tricycle commutes."
    ),
    (
        55.5, 150.4, 151, 200,
        "Unhealthy",
        "#FF0000",
        "General public may begin to experience adverse effects. Avoid outdoor sports and prolonged exposure along major highways (e.g. EDSA, C-5). Wear well-fitted N95 masks."
    ),
    (
        150.5, 250.4, 201, 300,
        "Very Unhealthy",
        "#8F3F97",
        "Health alert: serious risk of respiratory irritation for all residents. Active children and adults, and people with respiratory disease, avoid outdoor exertion. Seal indoor windows."
    ),
    (
        250.5, 500.4, 301, 500,
        "Hazardous",
        "#7E0023",
        "Health warning of emergency conditions. The entire population is likely to be affected. Remain indoors with air purification and seal entryways."
    ),
]


def compute_aqi_details(pm25_val: float) -> Dict[str, Any]:
    """
    Computes AQI index, category, color hex, and health advisory for a given PM2.5 value.
    Handles negative numbers, edge conditions, and extreme values (> 500 ug/m3).
    """
    if pm25_val is None:
        return {
            "aqi": 0,
            "category": "Unknown",
            "color_hex": "#CCCCCC",
            "health_advisory": "No sensor telemetry available."
        }

    # Standard practice: truncate to 1 decimal place
    c = max(0.0, round(float(pm25_val), 1))

    for c_low, c_high, i_low, i_high, cat, color, advisory in BREAKPOINTS:
        if c_low <= c <= c_high:
            # Linear interpolation
            aqi_calc = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return {
                "aqi": int(round(aqi_calc)),
                "category": cat,
                "color_hex": color,
                "health_advisory": advisory
            }

    # Value exceeds 500.4 ug/m3 -> top bracket
    return {
        "aqi": 500,
        "category": "Hazardous",
        "color_hex": "#7E0023",
        "health_advisory": "Health warning of emergency conditions. The entire population is likely to be affected. Remain indoors with air purification."
    }


def compute_aqi_tuple(pm25_val: float) -> Tuple[int, str, str, str]:
    """
    Tuple representation for PySpark UDF return type.
    """
    details = compute_aqi_details(pm25_val)
    return (
        details["aqi"],
        details["category"],
        details["color_hex"],
        details["health_advisory"]
    )


def get_aqi_spark_udf():
    """
    Returns a PySpark UDF configured with AQI_STRUCT_SCHEMA.
    """
    if not PYSPARK_AVAILABLE:
        raise RuntimeError("PySpark is required to generate the AQI Spark UDF. Install via 'pip install pyspark'.")
    return udf(compute_aqi_tuple, AQI_STRUCT_SCHEMA)

