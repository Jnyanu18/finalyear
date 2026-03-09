# AgriNexus Step-by-Step Build Playbook

Use this sequence if you extend the platform safely in future:

1. Create/verify monorepo structure (`client`, `server`, `docs`).
2. Stabilize backend foundation (config, DB, middleware, API versioning).
3. Implement auth and protected routes.
4. Build farmer profile module.
5. Add crop analysis (Gemini + fallback).
6. Add core decision engines (yield, disease, irrigation, harvest).
7. Add post-harvest engines (storage, market, profit).
8. Add outcome learning and intelligence updates.
9. Build/refresh dashboard UI pages and charts.
10. Enhance advisor chat and report generation.

## Validation Rule

After each step:

1. Run server and client.
2. Test module endpoint from UI.
3. Confirm DB records are created.
4. Commit changes.

## Suggested Sprint Order

- Sprint 1: Auth + Profile + Crop Analysis
- Sprint 2: Yield + Disease + Irrigation + Harvest
- Sprint 3: Storage + Market + Profit + Reports
- Sprint 4: Outcome Learning + Advisor quality + Production hardening
