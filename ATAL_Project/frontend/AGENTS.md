<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Service Layer

All data access goes through `src/services/`. Each service is an async module with HTTP calls to the Django backend (`/api/v1/...`). SANSAD §5 hub pages use `diagnostics.ts`, `actionPlans.ts`, `prediction.ts`, `reports.ts`, and `notifications.ts` — no mock exports.

- `types.ts` — All shared interfaces (TelemetryCell, ChatSession, AssetHealth, etc.)
- `telemetry.ts` — Telemetry cells, hub metrics, log generation, random walk ticks
- `chat.ts` — Static replies, demo reply generation, preloaded docs
- `sessions.ts` — Chat sessions CRUD + localStorage persistence (strips base64 images before save)
- `maintenance.ts` — Maintenance log records
- `prediction.ts` — Risk assets, RUL prediction data, score color utilities
- `monitor.ts` — Factory/asset health data (RUL Monitor page)
- `tickers.ts` — All scrolling marquee/ticker data arrays
- `factory.ts` — Factory tabs, production lines, slider-driven metric calculation
- `index.ts` — Barrel export of all services
