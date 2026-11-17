# Forever Market

A personal, dark-mode auction dashboard for **WoW Forever · US / Americas · Normal PvE · Horde**, fixed to `forever.normal.horde.us`.

Current AH prices, neon line graphs of price history, current supply, and estimated units sold per day. Goods are grouped into **fish/catches, cloth, leather/hides, ore and herbs**. Select an item in the table to update its chart and market details. No account, addon, running game client or database is required.

## Market dashboard

- Current lowest buyout and market median, displayed per item in gold, silver and copper.
- Neon cyan lowest-buyout and magenta market-median **line graphs**. Exact timestamps and currency appear in chart tooltips.
- Actual 24-hour, seven-day and 30-day observations when provided and authorized. No absent periods or price points are synthesized.
- Optional neon green listed-supply line graph, explicitly labeled as supply rather than purchase history.
- Estimated units sold per day, current units listed, days of supply, sales sample window and covered observation hours when supplied.
- Search by item name or ID; sort by price, seven-day median, estimated sales volume, supply, days of supply or deviation from typical price.
- Mobile layout, fixed night theme, remembered category, observation timestamps, manual refresh throttling, automatic cache-expiry refresh, and clear missing-data messages.
- Explicitly labeled synthetic demo mode for development; it never replaces a failed live request.

**Demand is inferred, not confirmed purchases.** AHledger estimates sales from auction observations. Cancellations and other listing changes may resemble purchases. The app never claims these are completed-sale records. The supply graph is not a sales graph, and no historical purchase amounts are invented. See the in-app information button and [data source record](docs/DATA-SOURCES.md).

The catalog has 128 curated records: 76 fish and associated catches, 6 cloths, 10 leathers/hides, 9 ores and 27 herbs. Each category remains under the provider’s 100-item batch limit. Catalog metadata was checked against Forever on 2026-11-17; it is not an exhaustive catalog of every game item.

## Windows launch — PowerShell

Install **Node.js 24 LTS** and Git, then run:

```powershell
git clone https://github.com/Estabondotcom/Forever-Market-.git
cd Forever-Market-
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. No key is needed for current prices and seven-day history under documented free access. To use a different development port:

```powershell
npm run dev -- --port 3001
```

Production launch:

```powershell
npm run build
npm start
```

To open it on your phone over the same Wi-Fi, use `http://YOUR-PC-LAN-IP:3000`. For home-server access through Tailscale, use `http://YOUR-SERVER-TAILSCALE-IP:3000` with Tailscale connected on both devices.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AHLEDGER_API_KEY` | No | Server-only AHledger key, sent as `Authorization: Bearer ...`. Documented free key adds 30-day history after December 10, 2026. |
| `PORT` | No | Production port, default 3000; use `--port` for development. |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | No | Standard system proxy configuration, normally unset on a home server. |
| `NEXT_TELEMETRY_DISABLED` | No | `1` disables Next.js telemetry; Docker already sets this. |

For local Node use, put the optional key in `.env.local`, then restart the server. Never use a `NEXT_PUBLIC_` variable for credentials. Secrets are excluded from Git and Docker build context. No key is required during builds or unit tests.

## Docker and CasaOS

CasaOS normally already provides Docker. In the server terminal:

```bash
cd /DATA/AppData
sudo git clone https://github.com/Estabondotcom/Forever-Market-.git wow-fishing
cd wow-fishing
sudo docker compose up -d --build
sudo docker compose ps
```

Open **http://YOUR-SERVER-IP:3000**. The existing Compose service name `fishing-tracker` and port are retained for compatibility. If port 3000 is occupied, change `3000:3000` to `3005:3000` in `compose.yaml` and use port 3005 in the browser.

For an optional API key in Docker, create `.env` beside `compose.yaml`:

```text
AHLEDGER_API_KEY=your_key_here
```

Apply it with `sudo docker compose up -d --force-recreate`. Never commit the file. The container runs as a non-root user and restarts after server reboots. No database or persistent market-cache volume is needed. Docker/CasaOS deployment has not been executed in this development environment.

Update an existing installation:

```bash
cd /DATA/AppData/wow-fishing
sudo git pull --ff-only
sudo docker compose up -d --build
```

Logs and stop commands:

```bash
sudo docker compose logs --tail=100 fishing-tracker
sudo docker compose down
```

## Checks and GitHub

```powershell
npm test
npm run typecheck
npm run build
npm run verify:api
node --conditions=react-server --import tsx scripts/smoke-routes.ts
```

The deterministic unit tests cover currency, demand calculations, missing/zero sales, sorting, category isolation, response parsing, fixed-market enforcement, auth failures, rate limits, caching and expiry. Fixtures are synthetic. The live verification scripts make small read-only requests and save no provider responses. The route smoke check verifies all five categories and representative price histories.

GitHub Actions automatically runs tests, type checking and a production build. GitHub stores the code; **GitHub Pages cannot run the server API routes**. Run on CasaOS, locally, or a Next.js-compatible host.

The managed development environment blocks the preview server from binding its port. Browser visual checks and physical iPhone testing remain unverified; TypeScript, build, unit tests and real API routes can still be checked.

## Freshness and terms

AHledger responses remain only in server/browser memory for their allowed Cache-Control lifetime. Expired data is removed and refreshed. The server coalesces duplicate requests, supports ETags when a reusable answer is available, and honors Retry-After. Manual refresh is throttled. A still-permitted response may be reused during an outage, but expired responses cannot become an indefinite offline snapshot. Refresh timing therefore follows the provider’s cache lifetime, often 60 seconds for the price table.

Latest actual auction observations are distinguished from fetch times. Missing sales or historical periods stay unavailable; estimated zero sales stays zero. Days of supply is units listed divided by estimated daily sales. If estimated sales is zero and stock exists, the ratio is infinite. Percentage comparisons are current buyout versus seven-day median, not a measured short-term trend.

## Structure

```text
src/app/             Page, fixed night theme, server API routes
src/components/      Market dashboard and neon line charts
src/data/            Curated item catalogs
src/lib/             Market comparisons, currency, parsers, adapter, cache, demo
scripts/             Real API and route verification
tests/              Synthetic deterministic tests
docs/               Source validation and provider limitations
licenses/           Retained source attribution and copyright notices
Dockerfile
compose.yaml
```

## Attribution and license

Prices from [AHledger](https://ahledger.com), used under its [API terms](https://ahledger.com/developers). Personal noncommercial use requires attribution; monetization or data archival can require additional licensing. This source remains GPL v3; see `LICENSE`. Original CMaNGOS notices are retained for the catalog’s provenance. Blizzard names and item facts belong to their owners. No protected game artwork is used. Not affiliated with Blizzard or AHledger.
