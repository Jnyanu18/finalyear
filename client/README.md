# Agri Pro Client

React + Vite frontend for Agri Pro.

## Run

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Backend Connectivity

In development, `vite.config.ts` proxies `/api` to `http://localhost:5000`.

For deployed/static environments, set one of:

```bash
VITE_API_ORIGIN=https://your-api-host
# or:
VITE_API_V1_BASE=https://your-api-host/api/v1
```

For realtime websocket updates behind Vercel, also set:

```bash
VITE_WS_ORIGIN=wss://your-api-host
```

## Vercel

This frontend is Vercel-ready as a static Vite deployment. The existing Express API and websocket server are not part of the static Vercel output, so point the frontend at a separately hosted backend with the `VITE_*` variables above.

The repo root already includes a `vercel.json` that builds `client/` and publishes `client/dist`.

## Build

```bash
npm run build
```
