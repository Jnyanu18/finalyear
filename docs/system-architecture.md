# AgriNexus + AgroSense System Architecture

## Purpose

This document merges the original AgriNexus product flow and the new AgroSense AI precision agriculture flow into one operational architecture.

AgriNexus remains the main application shell.
AgroSense is the intelligence layer added inside it.

## Unified Product Flow

1. User authenticates in AgriNexus.
2. User selects a field in the dashboard.
3. Frontend requests field state, indices, sensors, risks, forecasts, alerts, and model status from the backend.
4. Backend serves the latest operational state from the AgroSense service layer.
5. If the user triggers analysis, the backend starts the AgroSense analysis pipeline.
6. Pipeline collects spectral context, sensor context, historical context, and model context.
7. MATLAB and Python inference services process field intelligence workloads.
8. Backend evaluates rules, generates alerts, updates reports, and pushes live updates through WebSocket.
9. Frontend refreshes dashboard cards, maps, forecasts, sensor panels, and recommendations.
10. User exports a report or acts on the recommendation in the existing AgriNexus workflow.

## Architecture Layers

### 1. Experience Layer

Location:
- `client/`

Responsibility:
- Main dashboard
- Spectral view
- Sensor network view
- Reports view
- Existing AgriNexus modules like monitor, irrigation, harvest, market, profit, and advisor

Core flow:
- React pages call typed AgroSense API functions
- TanStack Query manages caching and refetch
- WebSocket hook receives live sensor snapshots and alert events
- Shared dashboard shell keeps AgriNexus navigation consistent

### 2. API and Orchestration Layer

Location:
- `server/`

Responsibility:
- JWT auth
- Rate limiting
- REST APIs
- WebSocket streaming
- Analysis orchestration
- Alert generation
- Report generation
- Notification dispatch

Core flow:
- Express receives request
- Auth middleware resolves user
- AgroSense route calls controller
- Controller calls service layer
- Service layer reads current state or triggers analysis
- Response returns JSON back to frontend

### 3. Intelligence Layer

Locations:
- `matlab/`
- `python-services/inference-service/`

Responsibility:
- Hyperspectral ingestion
- Index extraction
- Zone segmentation
- CNN inference
- LSTM forecasting
- Sensor fusion risk scoring
- Alert rule preparation

Core flow:
- MATLAB handles spectral-heavy and model-training workflows
- Python provides inference microservice fallback or hybrid execution
- Node bridge chooses MATLAB, Python, or synthetic fallback depending on environment

### 4. State and Storage Layer

Locations:
- MongoDB
- PostgreSQL
- InfluxDB
- Redis
- Local seeded runtime fallback in Node

Responsibility:
- MongoDB: legacy AgriNexus auth/profile flows
- PostgreSQL: field, zone, alert, report, model-version, and analysis-run records
- InfluxDB: sensor, index, and risk time-series
- Redis: Bull queue for analysis jobs
- In-memory seed store: immediate developer/runtime fallback

## End-to-End Data Flow

### A. Read Flow

1. Frontend requests `GET /api/v1/fields`.
2. Backend returns field summaries.
3. Frontend selects one field and requests:
   - `/map`
   - `/indices`
   - `/sensors`
   - `/sensors/history`
   - `/risk`
   - `/forecast`
   - `/insights`
   - `/models/status`
4. Backend aggregates field intelligence state.
5. Frontend renders map, KPI cards, charts, alerts, and recommendations.

### B. Analysis Flow

1. User clicks `Run Analysis`.
2. Frontend calls `POST /api/v1/fields/:id/analyze`.
3. Backend creates an analysis run.
4. Backend sends job to Bull queue if Redis is available.
5. If Redis is not available, backend runs analysis inline.
6. MATLAB bridge or Python inference service produces updated field intelligence output.
7. Backend persists the updated state.
8. Alert rules evaluate the result.
9. Notifications are dispatched.
10. WebSocket broadcasts analysis completion and fresh sensor/alert state.

### C. Live Sensor Flow

1. Frontend opens `WS /ws/sensors/:fieldId`.
2. Backend sends current sensor snapshot.
3. Backend pushes new snapshots every 3 seconds.
4. Backend pushes alert events on risk changes.
5. Frontend updates sensor cards and alert surfaces without page reload.

### D. Report Flow

1. User selects field and date range.
2. Frontend calls `GET /api/v1/reports/:fieldId`.
3. Backend composes report sections from the current field state.
4. Puppeteer tries to generate PDF.
5. If PDF rendering fails, backend falls back to HTML artifact.
6. Frontend opens the generated artifact URL.

## Unified Processing Pipeline

```text
Field Image / Hyperspectral Cube / Sensor Stream / Historical Series
    ->
Data Ingestion
    ->
Preprocessing and Calibration
    ->
Vegetation and Soil Index Extraction
    ->
Zone Segmentation
    ->
CNN Spatial Classification
    ->
LSTM Temporal Forecast
    ->
Sensor Fusion Pest Risk
    ->
Rule-Based Alert Evaluation
    ->
Recommendations, Reports, Notifications, Dashboard Updates
```

## Runtime Deployment Model

```text
React Client
    ->
Express API
    ->
AgroSense Services
    ->
Bull Queue / Redis
    ->
MATLAB Bridge or Python Inference
    ->
PostgreSQL + InfluxDB + MongoDB
    ->
WebSocket + Alerts + Reports
```

## How AgriNexus and AgroSense Fit Together

AgriNexus owns:
- user journey
- authentication
- navigation
- farm operations modules
- advisory and business workflows

AgroSense owns:
- field intelligence
- spectral analytics
- sensor fusion
- predictive models
- alerting
- precision reports

Merged result:
- AgriNexus is the application platform
- AgroSense is the precision intelligence engine inside the platform

## Recommended Mental Model

Think of the system as three connected loops:

1. Observe
   - monitor crops
   - stream sensors
   - inspect spectral layers

2. Predict
   - score stress
   - forecast vegetation trend
   - estimate pest risk

3. Act
   - raise alerts
   - recommend interventions
   - generate reports
   - feed the existing AgriNexus decision modules

## Current Practical Mode in This Repo

Today the repo supports two execution modes:

1. Immediate application mode
   - seeded AgroSense field state inside Node
   - no hard dependency on PostgreSQL, InfluxDB, Redis, Python, or MATLAB
   - useful for development and UI/API validation

2. Full precision mode
   - PostgreSQL + InfluxDB + Redis enabled
   - Python inference running
   - MATLAB bridge enabled
   - full production-oriented pipeline

## Recommended Next Evolution

1. Replace seeded runtime field state with PostgreSQL-backed repositories.
2. Add real MQTT ingestion into InfluxDB.
3. Connect MATLAB batch outputs to actual field uploads.
4. Move alert and report artifacts to persistent object storage.
5. Split the frontend bundle by route to reduce initial load.
