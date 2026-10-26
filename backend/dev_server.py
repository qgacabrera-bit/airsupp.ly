#!/usr/bin/env python3
"""
AirSupp.ly - Lightweight Local Development Server (Zero-Dependency)
==================================================================
Runs on Python standard library (no pip packages needed).
Serves /api/live and /api/history on port 8000 so the React frontend
can be developed and previewed immediately without Docker or MongoDB!
"""

import json
import math
import random
import time
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8000

CITIES = {
    "Manila": {
        "sensor_id": "PH-MNL-001",
        "latitude": 14.5995,
        "longitude": 120.9842,
        "pm25": 35.4,
        "pm10": 62.1,
        "temp": 31.2,
        "hum": 78.5
    },
    "Quezon City": {
        "sensor_id": "PH-QC-002",
        "latitude": 14.6760,
        "longitude": 121.0437,
        "pm25": 39.8,
        "pm10": 68.4,
        "temp": 30.5,
        "hum": 80.2
    },
    "Cebu": {
        "sensor_id": "PH-CEB-003",
        "latitude": 10.3157,
        "longitude": 123.8854,
        "pm25": 21.6,
        "pm10": 41.2,
        "temp": 31.0,
        "hum": 75.0
    },
    "Davao": {
        "sensor_id": "PH-DVO-004",
        "latitude": 7.1907,
        "longitude": 125.4553,
        "pm25": 15.2,
        "pm10": 29.5,
        "temp": 29.4,
        "hum": 82.4
    }
}

BREAKPOINTS = [
    (0.0, 12.0, 0, 50, "Good", "#00E400", "Air quality is satisfactory. Safe for all outdoor activities."),
    (12.1, 35.4, 51, 100, "Moderate", "#FFFF00", "Air quality is acceptable. Sensitive individuals should take caution along heavy traffic."),
    (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups", "#FF7E00", "Wear KF94/N95 masks on open-air jeepney/tricycle commutes."),
    (55.5, 150.4, 151, 200, "Unhealthy", "#FF0000", "Avoid prolonged exposure along major highways (e.g. EDSA, C-5)."),
    (150.5, 250.4, 201, 300, "Very Unhealthy", "#8F3F97", "Health alert: seal windows and avoid outdoor exertion."),
    (250.5, 500.4, 301, 500, "Hazardous", "#7E0023", "Emergency conditions: entire population at severe risk.")
]


def calculate_aqi(pm25):
    c = max(0.0, round(float(pm25), 1))
    for c_low, c_high, i_low, i_high, cat, hex_col, advisory in BREAKPOINTS:
        if c_low <= c <= c_high:
            calc = ((i_high - i_low) / (c_high - c_low)) * (c - c_low) + i_low
            return int(round(calc)), cat, hex_col, advisory
    return 500, "Hazardous", "#7E0023", "Emergency conditions. Remain indoors with air filtration."


def get_current_cities():
    now_utc = datetime.now(timezone.utc)
    t_seconds = time.time()
    results = []

    for city, base in CITIES.items():
        # Micro-jitter
        jitter = math.sin(t_seconds / 15.0 + hash(city) % 10) * 3.5 + random.uniform(-0.8, 0.8)
        pm25 = max(4.0, round(base["pm25"] + jitter, 1))
        pm10 = max(10.0, round(base["pm10"] + jitter * 1.6, 1))
        temp = round(base["temp"] + random.uniform(-0.2, 0.2), 1)
        hum = round(base["hum"] + random.uniform(-0.5, 0.5), 1)

        aqi, cat, hex_col, adv = calculate_aqi(pm25)
        iso_now = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        results.append({
            "sensor_id": base["sensor_id"],
            "city": city,
            "country": "PH",
            "latitude": base["latitude"],
            "longitude": base["longitude"],
            "pm25": pm25,
            "pm10": pm10,
            "temperature": temp,
            "humidity": hum,
            "aqi": aqi,
            "category": cat,
            "color_hex": hex_col,
            "health_advisory": adv,
            "window_start": iso_now,
            "window_end": iso_now,
            "processed_at": iso_now
        })

    # Sort AQI descending
    results.sort(key=lambda x: x["aqi"], reverse=True)
    return results


class DevHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/live":
            cities = get_current_cities()
            payload = {
                "total_cities": len(cities),
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "data": cities
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif path == "/api/history":
            city_filter = query.get("city", ["Manila"])[0]
            limit = int(query.get("limit", [50])[0])
            now_ms = time.time()
            points = []

            base = CITIES.get(city_filter, CITIES["Manila"])
            for i in range(limit - 1, -1, -1):
                t_point = now_ms - (i * 15)
                dt_point = datetime.fromtimestamp(t_point, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                jitter = math.sin(t_point / 60.0) * 8.0 + random.uniform(-1.5, 1.5)
                pm25 = max(5.0, round(base["pm25"] + jitter, 1))
                aqi, cat, hex_col, adv = calculate_aqi(pm25)

                points.append({
                    "city": city_filter,
                    "pm25": pm25,
                    "pm10": round(base["pm10"] + jitter * 1.4, 1),
                    "temperature": base["temp"],
                    "humidity": base["hum"],
                    "aqi": aqi,
                    "category": cat,
                    "color_hex": hex_col,
                    "health_advisory": adv,
                    "window_start": dt_point,
                    "window_end": dt_point,
                    "processed_at": dt_point
                })

            payload = {
                "city": city_filter,
                "count": len(points),
                "data": points
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif path == "/api/cities":
            body = json.dumps(list(CITIES.keys())).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif path == "/api/health":
            body = json.dumps({"status": "ok", "mode": "local-dev"}).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

        else:
            self.send_response(404)
            self.end_headers()


def run():
    print(f"[AirSupp.ly Dev Server] Listening on http://localhost:{PORT}")
    print(f"[AirSupp.ly Dev Server] Serving /api/live & /api/history (Press Ctrl+C to stop)")
    server = HTTPServer(("0.0.0.0", PORT), DevHandler)
    server.serve_forever()


if __name__ == "__main__":
    run()
