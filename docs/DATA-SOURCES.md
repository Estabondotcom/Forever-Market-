# Data validation record — 2026-11-17 UTC

## Verified through actual read-only requests

AHledger documentation: https://ahledger.com/developers (including access and terms sections).

- `GET /v1/markets`: HTTP 200. Exact market `forever.normal.horde.us` present.
- `GET /v1/prices/forever.normal.horde.us/13422?range=7d`: HTTP 200. `latest.observedAt`, `source`, `minBuyout`, `median`, `quantity`, `auctions`, `median7d`, `median30d`; `sales.estimatedPerDay`, `windowDays`, `coveredHours`; `series[].t/min/median/quantity`. 152 points in smoke verification. Actual snapshot time 2026-11-17T13:39:15Z. This is a validation record, not a saved price feed.
- `GET /v1/tooltip/forever.normal.horde.us?items=...`: HTTP 200. The market is an object with a **slash-separated slug**. Items are an array, with `salesPerDay`. Contrary to a general description of this endpoint, the observed payload **does not contain historical medians**. The adapter obtains those from the documented plain-text price table.
- `GET /v1/pricetable/forever.normal.horde.us`: HTTP 200. `AHL1|forever/normal/horde/us|unixTime|rowCount`; item rows have colon-separated fields; sales is scaled by ten. ETag present. Cache-Control `max-age=60` during verification.
- `GET /v1/items/{id}?game=forever`: HTTP 200 for all 76 catalog IDs. Item names and `vendorSell` were checked. The catalog is a curated list of item facts, not archived market prices. Research discovered substantial differences from Classic vendor values for heavy fish and several renamed items; these were not treated as identical to Classic. Revalidate item facts after patches.
- The app's own market and history route handlers were called against the real service: 76 snapshots, history 200, invalid-range 400. Nine estimates were rankable and five unranked with the observed market. Counts can change with market completeness and settings.

Authentication is documented as `Authorization: Bearer ahlk_...` or `x-ahl-api-key`. The implementation uses Bearer only, server side. No key was supplied, so keyed access and actual 401/403/429 responses are fixture-tested, not real-account tested. Seven-day free access and the announced December 10 access changes were verified in documentation. Additional live requests returned HTTP 200 for 24h (62 points) and 30d (13 supplied daily points) without a key before the access change; the adapter exposes only the supplied observations. The interface requests 24h and 30d only on demand, validates the returned range, and never constructs missing historical periods. A 403 hides 30d access.

## Cache and licensing policy

AHledger permits free noncommercial personal/community use with attribution. Prominent links appear next to market figures and on item details; provider campaign links are preserved. Do not monetize or resell this data without the appropriate license.

From 2026-12-10 provider terms prohibit retaining responses beyond their Cache-Control lifetime without a suitable license. Market and history responses are memory-only and removed at expiry. No market data is written to disk, localStorage, fixtures or a database. The browser removes expired displayed data and requests a fresh response. An unexpired cached response may be reused during an outage. Expired data cannot be used as an offline fallback. Automatic refresh therefore follows the observed provider cache lifetime (often 60 seconds for the price table), overriding the initially requested 30–60 minute interval. This is deliberate compliance with the stricter provider guidance. Item catalog facts have a separate research provenance date; they are not live auction observations.

## Fishing model provenance and license

Reference research:
https://github.com/AidVir/wow-forever-favor
`fishing.js`, `money.js`, `scripts/build-fishing.mjs`, and README were reviewed. No explicit license file appeared in its recursive repository tree. **No code or dataset from that project was copied.** Its default cast duration (15s), EU PvP prices, market model, and assertion that Classic mechanics apply to Forever were not adopted as verified facts. Its method counts disappearance of auctions as inferred sales; those can also be cancellations. Our demand model implements the user's specified one-day selling-capacity formula independently.

Upstream used independently:
https://github.com/cmangos/classic-db
`Full_DB/ClassicDB_1_12_1_z2815.sql.gz` — Classic 1.12 database, GPL v3. Full license and copyright notices are included under `licenses/`; the application is distributed under GPL v3. Original importer: `scripts/import-classic-data.py`. It expands group loot probabilities and reference tables and preserves secondary rolls. This is **not Forever server data**. The curated geographic records use explicit area IDs and exclude unknown tables. The source SQL is downloadable from upstream; it is not bundled.

Success formula cross-check:
https://github.com/cmangos/mangos-classic/blob/master/src/game/Entities/GameObject.cpp
Near fishing node handling: zone base threshold, effective skill and percentage rule. This is a Classic-derived assumption. Its GPL source implementation is not copied.

Forever guides reviewed:
- https://timesaver.gg/tools/wow-forever/professions/fishing — matches broad 25/75/150/225/300/425 reliable thresholds but is secondary, not proof of the precise success curve. No dataset copied.
- https://www.icy-veins.com/wow-forever/fishing — Fishing Rack/Hut and Whimsyfin in Redridge. **Whimsyfin is not added with a guessed ID, vendor value or probability.** Its current item ID and normal-water catch distribution remain to verify.
- https://www.wowhead.com/forever/item=21153/raw-greater-sagefish and item=6522/deviate-fish are candidate-location references. Their school/oasis entries intentionally have null probabilities and no claimed skill threshold.

## Unverified / incomplete

- All numerical catch distributions and the skill success curve remain unverified for Forever. There are **zero Forever-verified fishing locations** in this release. “Estimated” rankings answer which location wins **under the documented Classic model**, not a measured Forever optimum.
- Time-of-day effects for Nightfin, Sunscale and eels are not implemented because no reliable Forever probability table was found. Tables use the upstream average values; warnings remain visible.
- Seasonal fish use coarse Classic Oct–Mar / Apr–Sep UTC months. Exact equinox dates and US server clock alignment remain unverified. Disabling adjustments includes both fish as a labeled counterfactual.
- A Classic table can yield a primary catch and a separate seasonal bonus. The model supports expected units per successful cast, not just mutually exclusive probabilities; sums may exceed one. Do not normalize independent bonus rolls to 100%.
- Schools, pool competition, travel, camp upgrades and new Forever species need primary measurements. Campsite model extension exists, but is never activated.
- Snapshot trend is current buyout vs 7d median, explicitly labeled “vs. typical.” A recent time-series slope is not included in the market summary. Fish details expose the actual history.
- Sales confidence is absent from the batch endpoint; summary rows warn of unavailable sample coverage. Per-item history shows covered hours and warns for small samples.
- Providers WoWFAH, auctionhouse.fyi and Blizzard were not needed because AHledger worked. No website scraping or EU prices are used.

## Adding a verified location

Edit `src/data/locations.json`. Use a unique ID, precise water/area, mode, minimum/base/reliable skill, each conditional item probability (null when unknown), source, notes and confidence. Set `distributionComplete` only for exhaustive supported outcomes. Specify optional month/hour conditions only with a source; hours currently mean UTC. Set confidence to `verified` only after actual Forever evidence supports success and all catch probabilities. Record sample size, date, effective skill, camp state, pool state and server time. Preserve unknown values as null. Add deterministic engine fixtures for new mechanics.
