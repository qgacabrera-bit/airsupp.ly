You are a Principal DevOps and Data Platform Engineer. We have built the **AirSupp.ly** platform (Kafka Producer, PySpark Structured Streaming, FastAPI Middleware, and React/Vite PWA). 

Now, execute **PART 3**: Containerize the entire 6-service architecture so the whole platform boots with a single `docker compose up --build` command without manual terminal orchestration.

CRITICAL INSTRUCTION: Provide complete, working `Dockerfile`s, `nginx.conf`, and the master `docker-compose.yml` with proper internal Docker DNS networking, healthchecks, and startup dependency chains.

### Deliverables for Part 3:

1. **Python Backend/Producer Image (`/Dockerfile.python`):**
   - Multi-purpose lightweight `python:3.11-slim` image shared by both the `producer` and `backend` (FastAPI) containers.
   - Install `requirements.txt` (excluding `pyspark`, which runs in its own Spark container).

2. **PySpark Streaming Image (`/spark/Dockerfile`):**
   - Based on `bitnami/spark:3.5` (or `apache/spark-py`).
   - Pre-install `pymongo` and `python-dotenv`.
   - Pre-download or configure the `org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.2` Maven package in the entrypoint `spark-submit` command so it automatically connects to `kafka:29092` and `mongodb:27017`.

3. **React PWA Multi-Stage Image (`/frontend/Dockerfile` & `/frontend/nginx.conf`):**
   - Stage 1 (`node:20-alpine`): Build the production Vite PWA (`npm run build`), generating the Service Worker (`sw.js`) and `manifest.webmanifest`.
   - Stage 2 (`nginx:alpine`): Serve the static PWA build on port `80` and configure `nginx.conf` to reverse-proxy `/api/*` requests directly to `http://backend:8000/api/` (eliminating CORS and hardcoded localhost issues) while setting proper `Service-Worker-Allowed` and cache-control headers.

4. **Master `docker-compose.yml`:**
   - Orchestrate all 6 services (`kafka`, `mongodb`, `producer`, `spark-streaming`, `backend`, `frontend`) on a shared bridge network (`airsupply-net`).
   - Configure `healthcheck` blocks on `kafka` and `mongodb` so `producer`, `spark-streaming`, and `backend` wait (`condition: service_healthy`) before booting.