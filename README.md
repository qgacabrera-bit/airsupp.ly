# AirSupp.ly 🇵🇭
### Real-Time Environmental Health Platform for the Philippines

A complete, production-ready, fully containerized real-time environmental monitoring platform. Built with an Apache Kafka KRaft event stream, a PySpark Structured Streaming window analytics engine, MongoDB 7.0 time-series storage, an asynchronous FastAPI middleware layer, and an offline-first React (Vite) + Tailwind CSS Progressive Web App (PWA) served via Nginx.

---

## 1. Complete Project Architecture & Directory Layout

```
airsupp-ly/
├── .env                              # Active environment configuration
├── .env.example                      # Configuration template
├── .gitignore                        # Git ignore patterns for Python, Spark, Node & OS
├── docker-compose.yml                # Master Compose orchestrating all 6 microservices
├── Dockerfile.python                 # Shared Python 3.11-slim image for backend & producer
├── Instruction.md                    # Project requirements specification
├── README.md                         # Architecture runbook & execution guide
├── requirements.txt                  # Full Python dependencies (local dev)
├── requirements-python.txt           # Lightweight Python dependencies (containers)
│
├── backend/                          # FastAPI Asynchronous Middleware Layer
│   ├── __init__.py                   # Package initializer
│   ├── config.py                     # App configuration & CORS settings
│   ├── database.py                   # Async Motor (MongoDB) client & compound index setup
│   ├── main.py                       # REST API endpoints (/api/live, /api/history, /api/health)
│   └── schemas.py                    # Strict Pydantic models (abstracts DB internals)
│
├── producer/                         # Telemetry Ingestion & Kafka Producer
│   ├── __init__.py                   # Package initializer
│   └── producer.py                   # OpenAQ v3 client + "Making Air Out of Nothing At All" fallback
│
├── spark/                            # PySpark Structured Streaming Pipeline
│   ├── Dockerfile                    # bitnami/spark:3.5 with pymongo & spark-sql-kafka
│   ├── __init__.py                   # Package initializer
│   ├── aqi_calculator.py             # Philippine DENR / US EPA PM2.5 breakpoint algorithm
│   └── stream_processor.py           # 15s window, 30s watermark, dual Mongo sink (foreachBatch)
│
└── frontend/                         # React 18 / Vite / Tailwind CSS PWA
    ├── Dockerfile                    # Multi-stage image (node:20-alpine -> nginx:alpine)
    ├── nginx.conf                    # Nginx reverse-proxy (/api/* -> backend:8000) & PWA caching
    ├── public/
    │   ├── favicon.svg               # SVG leaf & pulse brand icon
    │   └── robots.txt
    ├── src/
    │   ├── api/
    │   │   └── client.js             # Resilient fetch client with timeout, caching & offline state
    │   ├── components/
    │   │   ├── AQICard.jsx           # Responsive status card with AQI gauge & health guidance
    │   │   ├── AQIScaleReference.jsx # Visual 6-tier EPA/DENR AQI breakpoint reference bar
    │   │   ├── HistoryChart.jsx      # Recharts interactive time-series with EPA reference lines
    │   │   └── Navbar.jsx            # Platform header, live pulse badge & manual sync trigger
    │   ├── utils/
    │   │   └── exportUtils.js        # PDF (jsPDF-AutoTable), Excel (.xlsx), and CSV export engines
    │   ├── App.jsx                   # Main layout container with 15s polling & city selection
    │   ├── index.css                 # Glassmorphic Tailwind CSS design system
    │   └── main.jsx                  # React DOM entrypoint with VitePWA auto-update registration
    ├── index.html                    # Single-page HTML shell with PWA meta tags & Inter typography
    ├── package.json                  # Node dependencies (React, Recharts, jsPDF, SheetJS, Tailwind)
    ├── postcss.config.js             # PostCSS Tailwind plugin configuration
    ├── tailwind.config.js            # Tailwind custom palette (AQI colors & dark tokens)
    └── vite.config.js                # Vite build with VitePWA NetworkFirst runtime caching
```

---

## 2. Six-Service Containerized Architecture

All 6 services communicate over a private bridge network (`airsupply-net`):

| Service | Container Name | Base Image | Role & Port Mappings |
|---|---|---|---|
| **`kafka`** | `airsupply-kafka` | `apache/kafka:3.7.2` | KRaft Event Broker (`kafka:29092` internal, `localhost:9092` external) |
| **`mongodb`** | `airsupply-mongodb` | `mongo:7.0` | Storage for `live_metrics` & `history_logs` (`mongodb:27017`) |
| **`producer`** | `airsupply-producer` | `Dockerfile.python` | Polls OpenAQ v3 & executes "Making Air Out of Nothing At All" fallback |
| **`spark-streaming`** | `airsupply-spark-streaming` | `spark/Dockerfile` | 15s tumbling window & DENR/EPA AQI evaluation with dual Mongo sinks |
| **`backend`** | `airsupply-backend` | `Dockerfile.python` | Async FastAPI middleware exposing `/api/live` & `/api/history` (`:8000`) |
| **`frontend`** | `airsupply-frontend` | `frontend/Dockerfile` | Production Nginx PWA reverse-proxying `/api/*` to `backend:8000` (`:80` & `:5173`) |

---

## 3. Quickstart: One-Command Startup

No local Java, Scala, Apache Spark, or Python setup is required on your host machine. Everything runs containerized inside Docker:

```bash
docker compose up --build
```

### Accessing the Platform:
- **Web PWA Dashboard:** [http://localhost](http://localhost) or [http://localhost:5173](http://localhost:5173)
- **FastAPI Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live City Telemetry:** [http://localhost:8000/api/live](http://localhost:8000/api/live)
- **City Historical Window Logs:** [http://localhost:8000/api/history?city=Manila](http://localhost:8000/api/history?city=Manila)

---

## 4. Verification & Health Monitoring

To monitor container status and healthchecks:
```bash
docker compose ps
```

To tail streaming logs from all services in real time:
```bash
docker compose logs -f
```

To inspect specific services:
```bash
# PySpark streaming micro-batch sinks
docker compose logs -f spark-streaming

# Kafka producer ingestion cycles
docker compose logs -f producer

# FastAPI middleware requests
docker compose logs -f backend
```

To stop all services cleanly:
```bash
docker compose down
```
