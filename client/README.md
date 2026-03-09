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

## Build

```bash
npm run build
```
