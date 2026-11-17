# WoW Forever Fishing Profit Tracker

A personall Next.js dashboard for **US / Americas · Normal PvE · Horde**, fixed to `forever.normal.horde.us`. Real AHledger prices and history; demand-aware session revenue; locally saved settings; no account, addon, running game client or database required.

**Data accuracy:** Auction integration has been tested against real endpoints. Fishing recommendations are explicitly **Classic-derived estimates**, not verified Forever catch rates. 12 numerical location tables and two incomplete candidates cover inland/coastal waters, schools and secondary catches. 76 item IDs/names/vendor values were checked against Forever metadata. New Forever fish, daytime probabilities and camp upgrades remain unverified. See [data validation and provenance](docs/DATA-SOURCES.md).

## GitHub workflow

Repository: https://github.com/Estabondotcom/Forever-Market-

Clone it with `git clone https://github.com/Estabondotcom/Forever-Market-.git` and run commands from the resulting `Forever-Market-` folder. Keep this entire folder as the repository root. `.github/workflows/ci.yml` automatically runs the deterministic tests, TypeScript check and production build on pushes and pull requests. These checks need no API key and make no live auction requests.

Clone the repository on Windows, then use the launch commands below. Store any optional provider key only in your local `.env.local` or your hosting environment. Do not upload it to the repository.

GitHub stores the code and runs CI. **GitHub Pages cannot host this version**, because live provider requests and secrets run in Next.js server routes. Run the app locally, on CasaOS using Docker, or on a Next.js-compatible server host. No deployment or repository publication happens automatically from this workflow.

## Windows launch — PowerShell

Install **Node.js 24 LTS** (includes npm). Copy this entire `wow-fishing` folder to `C:\Projects\wow-fishing`, then run:

```powershell
cd C:\Projects\wow-fishing
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. No API key is needed for current prices and seven-day history under documented free access. If port 3000 is occupied:

```powershell
npm run dev -- --port 3001
```

For a production build:

```powershell
npm test
npm run typecheck
npm run build
npm start
```

Open **http://localhost:3000**. `Ctrl+C` stops the server. To view it on an iPhone on the same Wi-Fi, use `http://YOUR-PC-LAN-IP:3000`; `ipconfig` shows the IPv4 address. Allow Node through Windows Firewall on your private network if prompted. Preferences are specific to each browser/device.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AHLEDGER_API_KEY` | No | Server-only AHledger key. `Authorization: Bearer ...`; never sent in browser URLs, JS bundles or storage. Documented free key unlocks 30-day history after December 10, 2026. |
| `PORT` | No | Production port; defaults to 3000. For development use `--port`. |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | No | Standard system proxy configuration; normally leave unset on Windows. |
| `NEXT_TELEMETRY_DISABLED` | No | Set to `1` to disable Next.js telemetry; already disabled in Docker. |

Edit `.env.local` to add a key, then restart the server. Never use a `NEXT_PUBLIC_` variable for credentials. `.env*` secrets are ignored by Git and Docker. Build requires no provider credentials.

## What the app does

- Opens with the best rankable estimated fishing spot and demand-adjusted / gross AH potential per hour.
- Filters locations by zone/name/catch and shows all catches, success, selected prices, vendor fallback and warnings.
- Searches and sorts market items by price, supply, estimated sales, deviation from typical price and estimated gross contribution at the best available spot.
- Shows actual minimum-buyout / median history with Recharts. Unsupported or empty periods show a message; they are never invented.
- Defaults to **300 base + 0 equipment + 0 lure**, 25 seconds per attempt, one-hour session, 5% AH cut and 5% assumed share. All recalculate and persist locally; reset restores defaults.
- Uses the lower of current buyout and 7-day median by default, then the AH fee. Missing typical price is not guessed.
- Caps session auction units at one day of estimated demand × assumed share. Verified vendor fallback handles excess, or the estimate becomes incomplete. Vendor wins when it pays more.
- Includes an explicit, prominent **synthetic demo mode**, isolated from live data. Click “Try labeled demo” at the bottom. It never starts automatically or replaces an API error.

All currency displays use gold, silver, copper. Integer per-item prices are rounded down after the fee; expected quantities retain fractional precision; aggregate revenue rounds only at the final copper boundary.

## Freshness and provider policy

AHledger API access was verified on 2026-11-17. Prices are player scan observations, not completed purchases. Estimated sales may include cancellations. View the actual observation time, not just the request time.

The provider's December 10 terms prohibit keeping responses past their allowed cache time. The app caches only in server memory, honors Cache-Control/ETag/Retry-After, coalesces simultaneous requests and throttles manual refresh. Expired responses are removed, so refresh follows provider lifetime (the price table was 60 seconds during verification) rather than 30 minutes. During an outage only a still-permitted cached answer can remain visible. Once expired, the app shows unavailable data, not an invented price or indefinitely stale snapshot. No auction history archive is built.

## Checks

```powershell
npm test
npm run typecheck
npm run build
npm run verify:api
```

`verify:api` makes five read-only provider requests, validates the actual response formats and prints a small status record without saving responses. The optional full route smoke check (PowerShell):

```powershell
node --conditions=react-server --import tsx scripts/smoke-routes.ts
```

41 deterministic unit tests cover currency, fees, skill, lures, mixed catches, conditional seasons, low/high demand, unknown vendor/sales, invalid data, ranking, fixed-market parsers, graph normalization, HTTP auth failures, ETags, caching, expiry and rate limits. They use synthetic fixtures, not retained live market data.

Validated in the development environment: real API requests and app route handlers, tests, TypeScript and production build. The cloud environment blocked the preview server from binding a port; **visual browser and physical iPhone QA remain unverified**. Responsive CSS is included for 375px and larger screens, but should be checked on your device.

## Project structure

```text
wow-fishing/
  src/app/                 Dashboard page, theme CSS and API routes
    api/market/            Fixed-market live summaries
    api/history/           Per-item validated history
  src/components/          Responsive dashboard, settings and detail panels
  src/data/                Curated fish and fishing-location JSON
  src/lib/                 Types, pure engine, currency, validation,
                           interchangeable auction adapter, cache, demo
  tests/                   Deterministic engine and HTTP/parser tests
  scripts/                 Real API verification, route smoke check,
                           original upstream Classic data importer
  docs/DATA-SOURCES.md     Verification, assumptions and provenance
  licenses/                CMaNGOS license and copyright notices
  Dockerfile
  compose.yaml
  .env.example
```

## Docker and CasaOS (optional)

From the project folder with Docker Engine / Docker Desktop installed:

```powershell
docker compose up -d --build
```

Open **http://localhost:3000** (or `http://CASAOS-LAN-IP:3000`). To supply the optional key, create a `.env` file beside `compose.yaml` containing `AHLEDGER_API_KEY=your_key`. Do not commit it. Restart after changes:

```powershell
docker compose up -d --force-recreate
docker compose logs -f fishing-tracker
docker compose down
```

On CasaOS, copy the project folder to persistent storage (for example `/DATA/AppData/wow-fishing`), open a terminal there, and run `docker compose up -d --build`. Local build context is required; CasaOS “Import Compose” may not upload source files. The app has no database or market cache volume. Use an unused host port such as `3005:3000` if CasaOS already uses 3000. Preferences live in the browser, not the container. Container runs as a non-root user; the key is provided only at runtime. Docker files are provided, but a Docker image build and CasaOS deployment have **not** been executed here.

## Limitations

No numerical fishing location is Forever-verified yet. Exact seasonal switch dates, daytime distributions, school rates, new Forever species such as Whimsyfin, and Rack/Hut effects need measurements. Item facts must be rechecked after game updates. Rankings are incomplete where necessary information is missing; the displayed subtotal is not a complete expected return. Auction deposits, relisting costs, travel, lure costs/uptime, pool competition and other unmodeled costs can materially reduce returns. Market trend compares current buyout with 7d median rather than measuring recent momentum. There are no guarantees of sales or personal market share.

## Attribution and license

Prices from [AHledger](https://ahledger.com); [API and terms](https://ahledger.com/developers). Classic-derived fishing table data from [CMaNGOS Classic DB](https://github.com/cmangos/classic-db), GPL v3, with original license and copyright notices included. This application source is GPL v3; see `LICENSE`. Blizzard game names and item facts remain the property of their owners. No protected game artwork is used. AidVir's reference methodology was studied; its unlicensed implementation/dataset was not copied. This personal tool is not affiliated with Blizzard or AHledger.
