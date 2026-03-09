# Agri Pro Monorepo

This repository runs as two active apps:

- `client/`: React + Vite frontend (`http://localhost:5173`)
- `server/`: Express API (`http://localhost:5000`)

The top-level package scripts now proxy to these apps.

## Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or hosted)

## Setup

1. Install root dependencies:

```bash
npm install
```

2. Install app dependencies:

```bash
npm --prefix client install
npm --prefix server install
```

3. Configure backend env:

`server/.env`

```bash
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=agrivision
AUTH_JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

4. Optional frontend env for non-proxied deployments:

`client/.env`

```bash
VITE_API_ORIGIN=http://localhost:5000
# or:
# VITE_API_V1_BASE=http://localhost:5000/api/v1
```

## Run (Development)

Start backend:

```bash
npm run dev:server
```

Start frontend in a second terminal:

```bash
npm run dev:client
```

## Validation

```bash
npm run build
curl http://localhost:5000/api/v1/health
```
