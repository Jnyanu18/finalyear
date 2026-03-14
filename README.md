# AgriNexus + AgroSense AI

This repository now runs the original AgriNexus farm workflow and an integrated AgroSense AI precision agriculture layer.

Architecture reference:
- `docs/system-architecture.md`

## What was added

- AgroSense field intelligence APIs under `server/routes/agrosense*.js`
- Real-time sensor websocket at `ws://localhost:5000/ws/sensors/:fieldId`
- React dashboard pages for:
  - ` /dashboard ` main AgroSense operations dashboard
  - ` /dashboard/spectral ` spectral view
  - ` /dashboard/sensors ` sensor network view
  - ` /dashboard/reports ` report generation
- PostgreSQL schema in `server/prisma/schema.prisma`
- Python inference service in `python-services/inference-service/`
- MATLAB processing and training scripts in `matlab/`
- Docker compose files for local and production-style stack boot

## Active applications

- `client/`: React 18 + Vite frontend
- `server/`: Express API with JWT auth, seeded AgroSense runtime data, queue hooks, notifications, and websocket streaming
- `python-services/inference-service/`: FastAPI inference microservice
- `matlab/`: hyperspectral ingestion, index extraction, segmentation, forecasting, fusion, and alert scripts

## Prerequisites

- Node.js 20+
- npm
- MongoDB for legacy AgriNexus auth/profile modules
- Optional: Docker Desktop, MATLAB, PostgreSQL, Redis, InfluxDB

## Environment

Copy `.env.example` and set values as needed.

Key variables:

- `MONGODB_URI`
- `AUTH_JWT_SECRET`
- `POSTGRES_URL`
- `REDIS_URL`
- `INFLUX_URL`
- `INFLUX_TOKEN`
- `PYTHON_INFERENCE_URL`
- `MATLAB_BRIDGE_MODE`
- `MATLAB_EXECUTABLE`

## Install

```bash
npm install
npm --prefix server install
npm --prefix client install
```

Optional Python service:

```bash
cd python-services/inference-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run locally

Backend:

```bash
npm run dev:server
```

Frontend:

```bash
npm run dev:client
```

Optional Python inference:

```bash
cd python-services/inference-service
uvicorn app:app --host 0.0.0.0 --port 8001
```

## Docker

Local stack:

```bash
docker compose up --build
```

Production-style stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## AgroSense API surface

Authenticated with JWT bearer tokens:

- `GET /api/v1/fields`
- `GET /api/v1/fields/:id/map`
- `GET /api/v1/fields/:id/indices`
- `GET /api/v1/fields/:id/sensors`
- `GET /api/v1/fields/:id/sensors/history?range=24h|7d|30d`
- `GET /api/v1/fields/:id/risk`
- `GET /api/v1/fields/:id/forecast`
- `GET /api/v1/fields/:id/insights`
- `POST /api/v1/fields/:id/analyze`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/:id/acknowledge`
- `GET /api/v1/models/status`
- `GET /api/v1/reports/:fieldId`
- `WS /ws/sensors/:fieldId`

## Validation completed in this workspace

- Backend AgroSense endpoints verified with a real JWT session
- Websocket sensor snapshot verified
- `client/` targeted ESLint passes for the new AgroSense files
- `client/` production build passes

## Notes

- AgroSense backend endpoints currently run from seeded in-memory field data unless PostgreSQL, InfluxDB, Redis, and the optional Python/MATLAB services are configured.
- PDF report generation falls back to HTML if Puppeteer cannot render a PDF in the current environment.
- The existing AgriNexus Mongo-backed modules remain intact.
