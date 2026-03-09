# AgriNexus

AgriNexus is a MERN-based farm decision intelligence platform that unifies:

- Crop monitoring
- Yield prediction
- Disease risk forecasting
- Irrigation planning
- Harvest planning
- Storage advice
- Market routing
- Profit simulation
- Outcome learning
- AI advisor chat

## Monorepo Structure

```text
agrinexus/
  client/   # React + Vite + Tailwind dashboard
  server/   # Express + MongoDB + Mongoose APIs
```

## Quick Start

1. Copy env values:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run client and server:

```bash
npm run dev
```

4. Open:

- Client: http://localhost:5173
- Server: http://localhost:8080/api/v1/health

## API Versioning

All backend routes are under `/api/v1`.

## Backend Modules

- Auth: `/api/v1/auth/*`
- Profile: `/api/v1/profile`
- Plant Analysis: `/api/v1/analysis/plant`
- Yield Prediction: `/api/v1/prediction/yield`
- Disease Prediction: `/api/v1/prediction/disease`
- Irrigation Recommendation: `/api/v1/irrigation/recommend`
- Harvest Planning: `/api/v1/harvest/plan`
- Storage Advice: `/api/v1/storage/advice`
- Market Routing: `/api/v1/market/best`
- Profit Simulation: `/api/v1/profit/simulate`
- Outcome Learning: `/api/v1/outcome/submit`
- Advisor Chat: `/api/v1/advisor/chat`

## Docker

From `agrinexus/`:

```bash
docker compose up --build
```
