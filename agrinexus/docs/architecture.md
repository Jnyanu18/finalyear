# AgriNexus System Architecture

## High-Level Flow

```text
Farmers (Web)
   ->
React Dashboard (Vite + Tailwind + Recharts)
   ->
Express API Gateway (/api/v1)
   ->
Business/Decision Services + AI Services
   ->
MongoDB (Atlas/Local)
```

## Backend Layers

```text
routes -> controllers -> services -> models
                      -> utils (Gemini, math, dataset)
```

## Decision Pipeline

```text
Crop Monitoring
 -> Yield Prediction
 -> Disease Forecast
 -> Irrigation Planning
 -> Harvest Planning
 -> Storage Advice
 -> Market Routing
 -> Profit Simulation
 -> Outcome Learning
```

## Collections Map

- `users`
- `farmer_profiles`
- `crop_analyses`
- `yield_predictions`
- `disease_predictions`
- `irrigation_recommendations`
- `harvest_plans`
- `storage_predictions`
- `market_predictions`
- `profit_simulations`
- `farm_outcomes`
- `farm_intelligence`

## API Summary

- Auth: `/api/v1/auth/*` and `/api/auth/*`
- Profile: `/api/v1/profile`
- Analysis: `/api/v1/analysis/plant`
- Prediction: `/api/v1/prediction/yield`, `/api/v1/prediction/disease`
- Irrigation: `/api/v1/irrigation/recommend`
- Harvest: `/api/v1/harvest/plan`
- Storage: `/api/v1/storage/advice`
- Market: `/api/v1/market/best`
- Profit: `/api/v1/profit/simulate`
- Outcome: `/api/v1/outcome/submit`
- Advisor: `/api/v1/advisor/chat`, `/api/v1/advisor/report`
