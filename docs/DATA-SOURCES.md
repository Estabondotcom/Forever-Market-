# Forever: Farmer’s Market — data validation — 2026-11-17

## Current scope

A fixed-market AH dashboard for Cloth, Fish, Herbs, Ore and Skinning. No routes, harvest inputs, fishing mechanics or projected revenue calculations are part of the application. Only market observations and documented estimates are presented.

## AHledger integration

Documentation and terms: https://ahledger.com/developers
API base: https://api.ahledger.com
Fixed market: `forever.normal.horde.us`

Actual read-only requests confirmed:

- `/v1/markets`: exact US Normal Horde market exists.
- `/v1/tooltip/{market}?items=...`: market is an object with slash-separated `slug`; `items[]` contains per-item `minBuyout`, `median`, `quantity`, `observedAt`, `salesPerDay`. The observed payload does not include historical medians.
- `/v1/pricetable/{market}`: plain-text `AHL1|market|unixTime|rowCount`, colon-separated rows. Fields 4 and 5 provide seven-day and thirty-day medians. The adapter combines this with tooltip observations. ETag and Cache-Control were observed.
- `/v1/prices/{market}/{id}?range=7d`: `latest` includes prices, quantity, auctions, actual observation time and source; `sales` includes `estimatedPerDay`, `windowDays` and `coveredHours`; `series[]` contains `t`, `min`, `median` and optional `quantity`.
- `/v1/items/{id}?game=forever`: curated catalog names, IDs and vendor facts were checked for all original catalog records; the reduced catalog contains 71 primary resources. Vendor facts are not used for calculations or displayed as profit estimates.

All five category routes returned HTTP 200: Cloth 6, Fish 25, Herbs 26, Ore 9, Skinning 5. Category batches remain below the documented 100-item limit. The current price table cache is shared between categories.

The latest application-route smoke check verified real seven-day history for Stonescale Eel (13422), Linen Cloth (2589), Rugged Leather (8170), Thorium Ore (10620), and Black Lotus (13468), with 152–153 supplied points per item. Estimated daily sales were present in these responses. Actual 24h and 30d requests also succeeded earlier on the same date, before the announced access changes. Only supplied periods/points are shown; access errors remain explicit.

Authentication is server-side `Authorization: Bearer ...`. No real key was supplied in development: keyed access and actual credential rejection are fixture-tested, not real-account tested. From December 10 the documented free key adds thirty-day history; the adapter gates it and handles provider 403 responses.

## What demand means

The demand display uses the provider’s **estimated units sold per day**, never the number of current auctions or the asking price. This is an inferred volume estimate, not confirmed purchased quantities. Listing disappearance can include cancellations. We do not infer extra purchases from falling supply or invent historical daily sales.

- Current supply = current units listed.
- Days of supply = units listed / estimated units sold per day.
- Missing daily estimate = unavailable, not zero.
- Zero estimated daily sales with positive supply = infinite days of supply.
- Sales sample window and coverage are displayed when the individual price response supplies them. Low or missing coverage is warned.
- AHledger supplies a current sales estimate, not purchased quantities per historical hour. The optional local collector supplies a separately labeled commodity-turnover proxy.

The single graph combines history and comparison on a UTC calendar axis. Default: seven daily points including today. Optional: thirty daily points including today. Daily price is the minimum of available lowest-buyout observations that day. No interpolation or zero fill replaces missing days. Current day is partial. Each item has its own color; solid lines show price and dotted lines show demand.

On this update, actual read-only 7d and 30d responses for Linen Cloth returned HTTP 200. Both had current `sales.estimatedPerDay/windowDays/coveredHours/method`. Historical `series[]` fields were only `t/min/median/p25/p75/quantity/auctions`: **no historical demand or purchased quantities**. The thirty-day response had only 13 supplied points; the chart retains missing dates as gaps instead of inventing the remaining days.

Without the optional local collector, live historical demand therefore remains null. A current rolling estimate may appear only at the graph's current endpoint, explicitly labeled as such. It is never backfilled over past dates. A missing current estimate remains unavailable; estimated zero remains zero. The price response's aggregate sales object can supply the current point, but cannot become a historical series. The mockup alone includes explicit synthetic `estimatedSalesPerDay` points to demonstrate full demand-history lines.

Secondary research: [auctionhouse.fyi documentation](https://auctionhouse.fyi/docs/api/data-model) describes book disappearance as estimated volume, not confirmed purchases. Its [versioned API contract](https://auctionhouse.fyi/developers/reference/protocol/api-v1.md), Market depth section, gates historical volume estimates behind `depth` access; the anonymous item read attempted during this update returned HTTP 403. No account/key with that access was supplied, no secondary adapter was claimed as working, and no anonymous listing quantity was relabeled as sold volume. A verified historical-sales source and its required access would be needed to populate full live demand history.

## Retention and attribution

Free personal/community use requires attribution. Links appear beside market data, item details and source notes; item campaign links are preserved. No website scraping, EU prices or alternate-market data are used.

From December 10 the terms prohibit retaining answers beyond their Cache-Control lifetime without an appropriate license. The implementation uses memory-only caches, removes expired market/history data, honors Cache-Control/ETag/Retry-After and coalesces identical requests. No AHledger auction data goes to localStorage, disk, fixtures or a database. Optional independently obtained Blizzard data is described below. The only current preference saved in localStorage is the selected category. Legacy browser preferences are no longer read.

A still-valid cached answer may be reused during an outage, but an expired answer cannot be displayed as an offline snapshot. Freshness compares actual observation timestamps, not just fetch time. An old observation can be warned even in a newly fetched response. Synthetic demo values are explicitly opt-in and never act as an error fallback.

## Catalog provenance and limits

The original fish/catch catalog selection was researched using Classic source material, including CMaNGOS Classic DB (GPL v3); its original license and copyright notices are retained. Item identities and vendor facts were then checked against Forever metadata. There is no numerical catch, route or farming dataset in the current application. No AidVir source code or unlicensed dataset was copied.

The 71-item catalog is curated and not exhaustive. It excludes secondary catches, trophy fish, bloated fish, potions, crates/chests, hides, gems, stones, Swiftthistle and Wildvine. Mageroyal (785) and Raw Sagefish (21071) were newly checked against the Forever item endpoint and included. Truesilver Ore and Black Lotus remain as direct-node resources, despite rare availability. Additional Forever-specific goods need verified item identities before inclusion. Catalog facts should be rechecked after patches.

## Verification limits

Automated checks cover currency, category isolation, demand math, sorting, fixed-market parser validation, graph normalization, missing data, provider auth errors, rate limiting and cache expiration. Live route checks passed for all categories and representative histories. Docker/CasaOS deployment and physical iPhone testing have not been performed here. The managed local preview server cannot bind its port. The published GitHub Pages mockup was instead checked in the cloud desktop browser: multiple independent switches, same-tab reset, Clear all, solid/dotted line rendering, same-tab isolation, and multi-item price histories worked. Desktop screenshot: `mockup/preview.jpg`. Physical iPhone testing is still unverified.

## GitHub Pages mockup

`preview/entry.tsx` uses the actual Dashboard component with `demoOnly` enabled. The generated `mockup/` bundle has no live provider requests and no server credentials. A prominent synthetic-data banner cannot be switched off in the public preview. It supports all five tabs, independent per-metric switches, one unified multi-item daily graph with solid price and dotted synthetic demand histories, default seven-day and optional thirty-day views. Real market data stays in the separately hosted Next.js app. The mockup is public under the existing GitHub Pages configuration, as requested; no live prices are archived in it.

### Three-day hourly view
The unified graph also offers **3 days · hourly**: 72 UTC hour buckets, including the partial current hour. It reuses the documented seven-day history response and groups available observations by hour, retaining the lowest observed buyout. Missing hours stay gaps. Seven-day and thirty-day views remain daily; seven days remains the default. Live historical demand remains unavailable; the current rolling estimate is only plotted at the current endpoint. The GitHub preview uses synthetic hourly history.

## Optional local Blizzard collector

The owner verified their own credentials and actual US Forever house 114 auction/commodity downloads on their CasaOS server. House identity remains community-mapped to Normal Horde, not explicitly supplied by Blizzard. The application now includes an opt-in, separately deployed collector with a 30-day TTL and read-only web access to its metrics. It does not archive AHledger responses.

The dotted graph can use estimated commodity-listing turnover per elapsed hour, with cancellation/expiry uncertainty, gaps, observed interval coverage and separate rolling row estimates explained in the UI. Baselines, timestamp deduplication, partial quantity reductions, outages, storage recovery, 30-day pruning, HTTP errors, conditional requests and graph integration have fixture tests. Actual continuous collector operation, hourly upstream cadence and Docker runtime remain to be confirmed on the owner's server. See [setup, sources, retention and limitations](BLIZZARD-COLLECTOR.md).
