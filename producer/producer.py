#!/usr/bin/env python3
"""
AirSupp.ly - Real-Time Telemetry Kafka Producer
=================================================
Ingests atmospheric telemetry for major Philippine metropolitan cities:
  - Manila (PH-MNL-001)
  - Quezon City (PH-QC-002)
  - Cebu (PH-CEB-003)
  - Davao (PH-DVO-004)

Features:
  1. OpenAQ API v3 client with API key authentication and rate-limit tolerance.
  2. "Making Air Out of Nothing At All" Fallback Generator:
     Produces realistic, bounded, mean-reverting random-walk micro-fluctuations
     (jitter) whenever sensor hardware is static, rate-limited, or offline.
  3. JSON payload serialization to Apache Kafka KRaft topic `air_supply_stream`.
  4. Resilient retry loops, connection backoff, and graceful signal handling.
"""

import os
import sys
import json
import time
import signal
import random
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import requests
from dotenv import load_dotenv
try:
    from kafka import KafkaProducer
    from kafka.errors import NoBrokersAvailable
except ImportError:
    KafkaProducer = None
    NoBrokersAvailable = Exception


# Load environment variables
load_dotenv()

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AirSupp.ly-Producer] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("airsupply.producer")

# Configuration constants
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "air_supply_stream")
OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
OPENAQ_BASE_URL = os.getenv("OPENAQ_BASE_URL", "https://api.openaq.org/v3").rstrip("/")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "15"))

# Philippine Cities Baseline & Geospatial Metadata
PHILIPPINE_CITIES: Dict[str, Dict[str, Any]] = {
    "Manila": {
        "sensor_id": "PH-MNL-001",
        "country": "PH",
        "latitude": 14.5995,
        "longitude": 120.9842,
        "openaq_location_id": 8118,  # Representative OpenAQ location or nearest station
        "baselines": {
            "pm25": 35.4,
            "pm10": 62.1,
            "temperature": 31.2,
            "humidity": 78.5
        },
        "bounds": {
            "pm25": (5.0, 160.0),
            "pm10": (12.0, 220.0),
            "temperature": (24.0, 38.0),
            "humidity": (45.0, 99.0)
        }
    },
    "Quezon City": {
        "sensor_id": "PH-QC-002",
        "country": "PH",
        "latitude": 14.6760,
        "longitude": 121.0437,
        "openaq_location_id": 8119,
        "baselines": {
            "pm25": 39.8,
            "pm10": 68.4,
            "temperature": 30.5,
            "humidity": 80.2
        },
        "bounds": {
            "pm25": (6.0, 180.0),
            "pm10": (15.0, 250.0),
            "temperature": (23.5, 37.5),
            "humidity": (48.0, 99.0)
        }
    },
    "Cebu": {
        "sensor_id": "PH-CEB-003",
        "country": "PH",
        "latitude": 10.3157,
        "longitude": 123.8854,
        "openaq_location_id": 8120,
        "baselines": {
            "pm25": 21.6,
            "pm10": 41.2,
            "temperature": 31.0,
            "humidity": 75.0
        },
        "bounds": {
            "pm25": (3.0, 110.0),
            "pm10": (8.0, 160.0),
            "temperature": (24.0, 36.0),
            "humidity": (50.0, 95.0)
        }
    },
    "Davao": {
        "sensor_id": "PH-DVO-004",
        "country": "PH",
        "latitude": 7.1907,
        "longitude": 125.4553,
        "openaq_location_id": 8121,
        "baselines": {
            "pm25": 15.2,
            "pm10": 29.5,
            "temperature": 29.4,
            "humidity": 82.4
        },
        "bounds": {
            "pm25": (2.0, 90.0),
            "pm10": (5.0, 130.0),
            "temperature": (23.0, 35.0),
            "humidity": (55.0, 98.0)
        }
    }
}


class MakingAirSimulationState:
    """
    "Making Air Out of Nothing At All" Engine:
    Maintains continuous telemetry state per city using bounded Ornstein-Uhlenbeck
    mean-reverting stochastic random walks. Guarantees realistic 15-second resolution
    streams even when external APIs update hourly or fail.
    """
    def __init__(self, city_name: str, config: Dict[str, Any]):
        self.city_name = city_name
        self.config = config
        self.current_state = {
            "pm25": float(config["baselines"]["pm25"]),
            "pm10": float(config["baselines"]["pm10"]),
            "temperature": float(config["baselines"]["temperature"]),
            "humidity": float(config["baselines"]["humidity"])
        }
        self.last_api_reading: Optional[float] = None
        self.last_api_update_time: Optional[float] = None

    def step_micro_fluctuation(self) -> Dict[str, float]:
        """
        Advances the telemetry state by 1 step (15 seconds) using bounded
        random-walk jitter with mean reversion towards the baseline.
        """
        baselines = self.config["baselines"]
        bounds = self.config["bounds"]

        jitter_specs = {
            "pm25": {"reversion": 0.08, "noise_sd": 1.1},
            "pm10": {"reversion": 0.08, "noise_sd": 1.8},
            "temperature": {"reversion": 0.05, "noise_sd": 0.12},
            "humidity": {"reversion": 0.05, "noise_sd": 0.35}
        }

        for metric, spec in jitter_specs.items():
            curr = self.current_state[metric]
            base = baselines[metric]
            low_b, high_b = bounds[metric]

            # Mean-reversion drift component
            drift = (base - curr) * spec["reversion"]
            # Gaussian random noise jitter
            noise = random.gauss(0, spec["noise_sd"])

            updated = curr + drift + noise
            # Bound and clamp to prevent nonsensical telemetry
            clamped = max(low_b, min(high_b, updated))
            self.current_state[metric] = round(clamped, 2)

        return self.current_state.copy()


class TelemetryIngestor:
    """
    Coordinates OpenAQ polling, fallback simulation, and Kafka ingestion.
    """
    def __init__(self):
        self.running = True
        self.producer: Optional[KafkaProducer] = None
        self.http_session = requests.Session()
        if OPENAQ_API_KEY:
            self.http_session.headers.update({"X-API-Key": OPENAQ_API_KEY})
        self.simulators: Dict[str, MakingAirSimulationState] = {
            city: MakingAirSimulationState(city, conf)
            for city, conf in PHILIPPINE_CITIES.items()
        }

    def connect_kafka(self, max_retries: int = 20, delay_seconds: int = 5) -> KafkaProducer:
        """
        Connects to Kafka KRaft with retry backoff for container bootstrap coordination.
        """
        if KafkaProducer is None:
            logger.critical("kafka module not installed. Please install 'kafka-python-ng' from requirements.txt.")
            sys.exit(1)

        logger.info("Attempting to connect to Kafka at %s...", KAFKA_BOOTSTRAP_SERVERS)
        for attempt in range(1, max_retries + 1):
            try:
                producer = KafkaProducer(
                    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
                    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                    key_serializer=lambda k: k.encode("utf-8") if k else None,
                    acks="all",
                    retries=3,
                    linger_ms=10,
                    request_timeout_ms=15000
                )
                logger.info("Successfully connected to Kafka KRaft cluster.")
                return producer
            except NoBrokersAvailable as e:
                logger.warning(
                    "Kafka broker not ready (attempt %d/%d): %s. Retrying in %ds...",
                    attempt, max_retries, e, delay_seconds
                )
                time.sleep(delay_seconds)
            except Exception as e:
                logger.error("Unexpected error connecting to Kafka: %s. Retrying...", e)
                time.sleep(delay_seconds)

        logger.critical("Could not establish connection to Kafka after %d attempts.", max_retries)
        sys.exit(1)

    def fetch_openaq_telemetry(self, city: str, config: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Attempts to fetch live telemetry from OpenAQ API v3.
        Falls back to None on rate limits (429), auth failure, or missing stations.
        """
        try:
            # OpenAQ v3 /locations endpoint or /sensors
            location_id = config.get("openaq_location_id")
            url = f"{OPENAQ_BASE_URL}/locations/{location_id}/latest"
            response = self.http_session.get(url, timeout=4.0)

            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                telemetry: Dict[str, float] = {}
                for item in results:
                    parameter = item.get("parameter", {}).get("name")
                    value = item.get("value")
                    if parameter == "pm25" and value is not None:
                        telemetry["pm25"] = round(float(value), 2)
                    elif parameter == "pm10" and value is not None:
                        telemetry["pm10"] = round(float(value), 2)
                    elif parameter == "temperature" and value is not None:
                        telemetry["temperature"] = round(float(value), 2)
                    elif parameter == "relativehumidity" and value is not None:
                        telemetry["humidity"] = round(float(value), 2)

                if "pm25" in telemetry:
                    return telemetry
            elif response.status_code == 429:
                logger.warning("OpenAQ API rate limit reached (HTTP 429). Triggering Fallback Mode.")
            elif response.status_code == 401 or response.status_code == 403:
                logger.debug("OpenAQ API Key invalid or restricted. Triggering Fallback Mode.")
        except requests.RequestException as err:
            logger.debug("OpenAQ API request error for %s: %s", city, err)
        except Exception as e:
            logger.debug("OpenAQ parsing error for %s: %s", city, e)

        return None

    def get_city_payload(self, city: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates telemetry: attempts live OpenAQ reading; if unavailable or unchanged,
        seamlessly activates "Making Air Out of Nothing At All" bounded micro-fluctuation.
        """
        simulator = self.simulators[city]
        live_data = self.fetch_openaq_telemetry(city, config)

        now_utc = datetime.now(timezone.utc)
        iso_timestamp = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        if live_data and "pm25" in live_data:
            current_pm25 = live_data["pm25"]
            # If the physical reading changed, update simulator base
            if simulator.last_api_reading != current_pm25:
                simulator.last_api_reading = current_pm25
                simulator.last_api_update_time = time.time()
                source = "OpenAQ-v3-Live"
                metrics = {
                    "pm25": current_pm25,
                    "pm10": live_data.get("pm10", config["baselines"]["pm10"]),
                    "temperature": live_data.get("temperature", config["baselines"]["temperature"]),
                    "humidity": live_data.get("humidity", config["baselines"]["humidity"])
                }
                simulator.current_state = metrics.copy()
            else:
                # Sensor value unchanged - apply micro-fluctuations to maintain stream freshness
                source = "Simulation-Fallback-Unchanged"
                metrics = simulator.step_micro_fluctuation()
        else:
            # API unavailable, rate-limited, or no key provided
            source = "Simulation-Fallback-AirMaking"
            metrics = simulator.step_micro_fluctuation()

        payload = {
            "sensor_id": config["sensor_id"],
            "city": city,
            "country": config["country"],
            "latitude": config["latitude"],
            "longitude": config["longitude"],
            "pm25": metrics["pm25"],
            "pm10": metrics["pm10"],
            "temperature": metrics["temperature"],
            "humidity": metrics["humidity"],
            "source": source,
            "event_time": iso_timestamp
        }
        return payload

    def run(self):
        """
        Main execution loop: polls & publishes telemetry every POLL_INTERVAL_SECONDS.
        """
        self.producer = self.connect_kafka()
        logger.info(
            "AirSupp.ly Producer initiated. Polling %d cities every %d seconds to topic '%s'...",
            len(PHILIPPINE_CITIES), POLL_INTERVAL_SECONDS, KAFKA_TOPIC
        )

        def handle_shutdown(signum, frame):
            logger.info("Termination signal received (%s). Shutting down producer cleanly...", signum)
            self.running = False

        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

        while self.running:
            loop_start = time.time()
            for city, config in PHILIPPINE_CITIES.items():
                if not self.running:
                    break
                payload = self.get_city_payload(city, config)
                try:
                    future = self.producer.send(
                        topic=KAFKA_TOPIC,
                        key=city,
                        value=payload
                    )
                    # Block briefly to ensure delivery
                    record_metadata = future.get(timeout=5)
                    logger.info(
                        "Published: [%s] PM2.5=%.1f | PM10=%.1f | Temp=%.1f°C | Hum=%.1f%% | Src=%s (offset=%d)",
                        payload["city"], payload["pm25"], payload["pm10"],
                        payload["temperature"], payload["humidity"], payload["source"],
                        record_metadata.offset
                    )
                except Exception as ex:
                    logger.error("Failed to publish telemetry for %s: %s", city, ex)

            # Flush micro-batch
            if self.producer:
                self.producer.flush()

            # Maintain strict cadence
            elapsed = time.time() - loop_start
            sleep_time = max(0.5, POLL_INTERVAL_SECONDS - elapsed)
            time.sleep(sleep_time)

        if self.producer:
            logger.info("Flushing and closing Kafka producer connection...")
            self.producer.flush()
            self.producer.close()
        logger.info("AirSupp.ly Producer shutdown complete.")


if __name__ == "__main__":
    ingestor = TelemetryIngestor()
    ingestor.run()
