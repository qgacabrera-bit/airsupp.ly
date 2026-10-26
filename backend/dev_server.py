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
    # --- National Capital Region (NCR) ---
    "Manila": {"sensor_id": "PH-MNL-001", "region": "NCR", "latitude": 14.5995, "longitude": 120.9842, "pm25": 35.4, "pm10": 62.1, "temp": 31.2, "hum": 78.5},
    "Quezon City": {"sensor_id": "PH-QC-002", "region": "NCR", "latitude": 14.6760, "longitude": 121.0437, "pm25": 39.8, "pm10": 68.4, "temp": 30.5, "hum": 80.2},
    "Makati": {"sensor_id": "PH-MKT-005", "region": "NCR", "latitude": 14.5547, "longitude": 121.0244, "pm25": 33.2, "pm10": 58.6, "temp": 31.4, "hum": 76.8},
    "Taguig": {"sensor_id": "PH-TGG-006", "region": "NCR", "latitude": 14.5454, "longitude": 121.0489, "pm25": 28.5, "pm10": 51.2, "temp": 31.0, "hum": 77.4},
    "Pasig": {"sensor_id": "PH-PSG-007", "region": "NCR", "latitude": 14.5764, "longitude": 121.0851, "pm25": 36.1, "pm10": 64.0, "temp": 30.8, "hum": 79.1},
    "Caloocan": {"sensor_id": "PH-CAL-008", "region": "NCR", "latitude": 14.6416, "longitude": 120.9762, "pm25": 42.0, "pm10": 72.3, "temp": 31.5, "hum": 81.0},
    "Parañaque": {"sensor_id": "PH-PRQ-009", "region": "NCR", "latitude": 14.4793, "longitude": 121.0198, "pm25": 31.8, "pm10": 55.4, "temp": 31.3, "hum": 78.0},
    "Muntinlupa": {"sensor_id": "PH-MNT-010", "region": "NCR", "latitude": 14.4081, "longitude": 121.0415, "pm25": 27.4, "pm10": 49.8, "temp": 30.9, "hum": 77.2},
    "Marikina": {"sensor_id": "PH-MRK-011", "region": "NCR", "latitude": 14.6507, "longitude": 121.1029, "pm25": 30.2, "pm10": 53.7, "temp": 30.1, "hum": 82.5},

    # --- Luzon ---
    "Baguio City": {"sensor_id": "PH-BGO-012", "region": "Luzon", "latitude": 16.4023, "longitude": 120.5960, "pm25": 14.2, "pm10": 26.5, "temp": 19.5, "hum": 88.0},
    "Angeles City": {"sensor_id": "PH-ANG-013", "region": "Luzon", "latitude": 15.1450, "longitude": 120.5887, "pm25": 32.5, "pm10": 58.0, "temp": 31.8, "hum": 74.5},
    "San Fernando, Pampanga": {"sensor_id": "PH-SFP-014", "region": "Luzon", "latitude": 15.0307, "longitude": 120.6897, "pm25": 34.0, "pm10": 60.5, "temp": 31.6, "hum": 75.0},
    "Antipolo": {"sensor_id": "PH-ANT-015", "region": "Luzon", "latitude": 14.5842, "longitude": 121.1763, "pm25": 22.4, "pm10": 41.0, "temp": 28.9, "hum": 82.0},
    "Batangas City": {"sensor_id": "PH-BTG-016", "region": "Luzon", "latitude": 13.7565, "longitude": 121.0583, "pm25": 24.1, "pm10": 44.8, "temp": 30.8, "hum": 79.5},
    "Calamba": {"sensor_id": "PH-CLM-017", "region": "Luzon", "latitude": 14.2140, "longitude": 121.1578, "pm25": 26.8, "pm10": 48.2, "temp": 30.6, "hum": 80.4},
    "Puerto Princesa": {"sensor_id": "PH-PPS-018", "region": "Luzon", "latitude": 9.7392, "longitude": 118.7353, "pm25": 9.8, "pm10": 18.5, "temp": 29.8, "hum": 83.2},
    "Legazpi City": {"sensor_id": "PH-LGZ-019", "region": "Luzon", "latitude": 13.1391, "longitude": 123.7438, "pm25": 16.5, "pm10": 31.2, "temp": 29.2, "hum": 85.0},
    "Naga City": {"sensor_id": "PH-NGA-020", "region": "Luzon", "latitude": 13.6218, "longitude": 123.1948, "pm25": 18.2, "pm10": 34.0, "temp": 29.5, "hum": 84.1},

    # --- Visayas ---
    "Cebu": {"sensor_id": "PH-CEB-003", "region": "Visayas", "latitude": 10.3157, "longitude": 123.8854, "pm25": 11.0, "pm10": 19.8, "temp": 31.0, "hum": 75.0},
    "Mandaue City": {"sensor_id": "PH-MND-021", "region": "Visayas", "latitude": 10.3340, "longitude": 123.9427, "pm25": 23.5, "pm10": 45.0, "temp": 31.2, "hum": 76.1},
    "Iloilo City": {"sensor_id": "PH-ILO-022", "region": "Visayas", "latitude": 10.7202, "longitude": 122.5621, "pm25": 17.8, "pm10": 33.6, "temp": 30.4, "hum": 79.0},
    "Bacolod City": {"sensor_id": "PH-BCD-023", "region": "Visayas", "latitude": 10.6765, "longitude": 122.9509, "pm25": 19.4, "pm10": 36.2, "temp": 30.5, "hum": 78.4},
    "Tacloban City": {"sensor_id": "PH-TAC-024", "region": "Visayas", "latitude": 11.2442, "longitude": 125.0039, "pm25": 15.0, "pm10": 28.4, "temp": 29.6, "hum": 84.8},
    "Tagbilaran City": {"sensor_id": "PH-TAG-025", "region": "Visayas", "latitude": 9.6444, "longitude": 123.8566, "pm25": 13.5, "pm10": 25.1, "temp": 30.0, "hum": 81.2},

    # --- Mindanao ---
    "Davao": {"sensor_id": "PH-DVO-004", "region": "Mindanao", "latitude": 7.1907, "longitude": 125.4553, "pm25": 15.2, "pm10": 29.5, "temp": 29.4, "hum": 82.4},
    "Cagayan de Oro": {"sensor_id": "PH-CDO-026", "region": "Mindanao", "latitude": 8.4542, "longitude": 124.6319, "pm25": 20.3, "pm10": 38.8, "temp": 30.2, "hum": 80.5},
    "General Santos": {"sensor_id": "PH-GEN-027", "region": "Mindanao", "latitude": 6.1164, "longitude": 125.1716, "pm25": 18.6, "pm10": 35.4, "temp": 31.5, "hum": 76.0},
    "Zamboanga City": {"sensor_id": "PH-ZAM-028", "region": "Mindanao", "latitude": 6.9214, "longitude": 122.0790, "pm25": 16.8, "pm10": 32.0, "temp": 30.7, "hum": 81.5},
    "Iligan City": {"sensor_id": "PH-ILG-029", "region": "Mindanao", "latitude": 8.2280, "longitude": 124.2452, "pm25": 19.1, "pm10": 36.7, "temp": 29.9, "hum": 83.0},
    "Butuan City": {"sensor_id": "PH-BUT-030", "region": "Mindanao", "latitude": 8.9475, "longitude": 125.5406, "pm25": 14.5, "pm10": 27.9, "temp": 29.7, "hum": 84.0}
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
