# Local Blizzard demand-trend collector

This optional worker estimates commodity turnover for the 71 tracked resources. It reads **US**, `dynamic-forever-us`, ruleset **2**, auction house **114** only. It does not enable other regions, factions, houses or game versions. The current AHledger adapter remains the main live price/rolling-demand source.

## What has been verified

The owner successfully ran the included verifier on their CasaOS server with their own credentials. Authentication, US Normal ruleset lookup, house 114's regular auctions and commodities all returned actual snapshots with Last-Modified headers. No credentials were supplied to the development environment.

House 114's Normal Horde identity is **community-mapped**, not stated by the Blizzard index. References:
- https://outof.games/realms/forever/auctions/house/114/ (Normal Horde label and mapping caveat)
- https://saddlebagexchange.com/wow-forever/upload-timers (Normal Horde 114)

Enabling this overlay opts into that mapping. A successful ruleset URL alone is not proof of house identity. The collector itself has deterministic and mocked-HTTP tests; actual continuous collection, runtime Docker deployment and update cadence must still be checked on the owner's server.

## Enable on the existing CasaOS installation

In the CasaOS terminal:

```bash
cd /DATA/AppData/wow-fishing
sudo git pull --ff-only
sudo nano .env.local
```

Keep your existing credentials and add these two settings (only once; edit existing values instead of making duplicate entries):

```dotenv
BLIZZARD_CLIENT_ID=your_existing_client_id
BLIZZARD_CLIENT_SECRET=your_existing_client_secret
BLIZZARD_COLLECTOR_ENABLED=true
BLIZZARD_HOUSE_ID=114
```

Save: Ctrl+O, Enter, Ctrl+X. Then:

```bash
sudo chmod 600 .env.local
sudo docker compose -f compose.yaml -f compose.blizzard.yaml up -d --build
sudo docker compose -f compose.yaml -f compose.blizzard.yaml ps
sudo docker compose -f compose.yaml -f compose.blizzard.yaml logs --tail=40 blizzard-collector
```

Open the same address as before: `http://YOUR_SERVER_IP:3000`. No separate web port is added. Node.js on the host is unnecessary. The worker runs even when no browser is open, and restarts after server reboots.

The app displays collector state, latest actual observation, freshness warnings, and the independent demand methods. A first valid snapshot gives `warming`; two distinct versions 15 minutes to two hours apart permit an estimate. `unchanged` means Blizzard returned the same snapshot, not zero sales. Long gaps give `gap`; later adjacent snapshots resume the trend. An unchanged Last-Modified is never assigned a new observation time.

**Send only the collector log output when troubleshooting, never `.env.local`.** Logs contain bounded statuses and snapshot timestamps, no OAuth response bodies, headers, secrets or tokens.

## Measurement and interpretation

The worker reads the per-house **commodities** feed, because these are the main stackable farmed resources. It does not estimate demand from regular non-commodity auction listings, or claim that absence from commodities proves absence from every auction feed.

For each listing ID present in the previous snapshot, it sums `max(0, previous quantity - current quantity)`; a disappeared ID contributes its remaining previous quantity. Newly listed units are not sales. It divides this disappearance quantity by the elapsed time between actual snapshot timestamps, giving an **estimated commodity turnover/hour proxy**.

- Cancellations, expiry, relisting and ID changes can inflate the proxy. There is no verified Forever expiry-band model here, so these are not silently subtracted with a borrowed Classic formula.
- Listings created and sold entirely between snapshots are missed. The number is neither confirmed sales nor a strict upper/lower bound on all actual sales.
- A genuine measured zero remains zero. Missing/failed/repeated snapshots never create zero-filled hourly records.
- Intervals shorter than 15 minutes or longer than two hours get no rate. A new baseline is saved so the next suitable interval can recover.
- A point belongs to the interval ending at its snapshot timestamp. It is an interval average, not an exact clock-hour transaction count. Daily aggregation is weighted by observed duration; uncovered hours are not filled. Tooltips show observed coverage.
- The trend needs time to accumulate. Past days cannot be reconstructed from a current listing snapshot.

The existing independent price/demand switches remain on the same 3-day hourly, 7-day daily and 30-day daily graph. Dotted demand history uses the collector's turnover proxy once enabled. **Item rows still show AHledger's rolling daily sales estimate / 24**, clearly identified as a separate measure. Where AHledger price history is unavailable, the graph can use your collected Blizzard prices and labels this fallback. Thirty-day local history needs no AHledger key, but includes only the observations actually collected.

## Cadence, caching and failures

Every hour the worker obtains an application token and conditionally revalidates the fixed commodity URL with ETag and/or If-Modified-Since. It uses normal request revalidation (`Cache-Control: no-cache`), never random cache-busting query strings. An HTTP 304 or unchanged/regressed Last-Modified is a no-op for history. HTTP errors do not become market observations; Retry-After cooldowns are preserved across restarts. No-store responses are rejected for persistence.

The owner's response advertised `max-age=86400`. This describes cache freshness, not proof of a daily origin refresh schedule. Explicit conditional revalidation can discover a changed origin document without inventing fresh timestamps. **Hourly upstream changes remain unverified**. If Blizzard serves an unchanged snapshot all day, the app shows that fact and leaves turnover gaps; hourly polling does not guarantee hourly data.

Blizzard describes If-Modified-Since support here:
https://us.forums.blizzard.com/en/blizzard/t/world-of-warcraft-api-update-visions-of-nzoth/3461

## Storage and retention

The named Docker volume `blizzard-history` contains `history.json`, written atomically. The web app mounts it read-only; only the single collector writes it. Both containers use the same unprivileged tracker UID. Do not scale this single-writer service to multiple replicas.

Only tracked item/listing IDs, remaining quantities, current lows, observation timestamps, interval metrics and bounded collection status are stored. No sellers, player characters, tokens, secrets or full unfiltered auction responses are saved. AHledger data is never written to this volume. Secrets stay in `.env.local`, excluded from Git and image builds, and are supplied only to the collector.

Blizzard's API terms require a maximum 30-day TTL:
https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use

Records (including the beginning of measured intervals) and expired raw baselines are pruned on writes, during hourly housekeeping even on HTTP failure, and immediately at worker startup. The web reader independently filters expired records. Old records are not renewed simply because the same snapshot was re-fetched. Keep backups/snapshots of this volume out of long-term archives or apply the same retention. An entirely powered-off server cannot perform housekeeping until it starts.

The volume survives normal rebuilds/restarts. **Do not use `docker compose down -v` unless you intend to delete your collected history.** Do not copy the history file into Git. Local `market-data/` directories are ignored by Git and Docker builds.

## Updates, pause and diagnostics

Use both Compose files on subsequent updates:

```bash
cd /DATA/AppData/wow-fishing
sudo git pull --ff-only
sudo docker compose -f compose.yaml -f compose.blizzard.yaml up -d --build
```

To pause collection while keeping the dashboard running:

```bash
sudo docker compose -f compose.yaml -f compose.blizzard.yaml stop blizzard-collector
```

The graph will warn when the last observation becomes stale. The dashboard's `/api/collector?category=cloth` endpoint contains only filtered public metrics and bounded status, not raw listing IDs or credentials. A missing file means not started. Invalid/corrupt or mismatched-market history is rejected instead of being plotted. A corrupt worker state stops rather than silently replacing existing history.

`http-401`/`http-403`: check the local credentials/access. `http-429`: wait for the retained cooldown. `collection-error`: inspect connectivity and endpoint availability; no private provider error body is logged. Request timeouts are bounded; persistent failures preserve history and leave gaps.
