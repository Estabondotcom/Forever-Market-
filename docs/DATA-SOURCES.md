# Market data validation — 2026-11-17

## Current scope

A fixed-market AH dashboard for fish/catches, cloth, leather/hides, ore and herbs. No routes, harvest inputs, fishing mechanics or projected revenue calculations are part of the application. Only market observations and documented estimates are presented.

## AHledger integration

Documentation and terms: https://ahledger.com/developers
API base: https://api.ahledger.com
Fixed market: `forever.normal.horde.us`

Actual read-only requests confirmed:

- `/v1/markets`: exact US Normal Horde market exists.
- `/v1/tooltip/{market}?items=...`: market is an object with slash-separated `slug`; `items[]` contains per-item `minBuyout`, `median`, `quantity`, `observedAt`, `salesPerDay`. The observed payload does not include historical medians.
- `/v1/pricetable/{market}`: plain-text `AHL1|market|unixTime|rowCount`, colon-separated rows. Fields 4 and 5 provide seven-day and thirty-day medians. The adapter combines this with tooltip observations. ETag and Cache-Control were observed.
- `/v1/prices/{market}/{id}?range=7d`: `latest` includes prices, quantity, auctions, actual observation time and source; `sales` includes `estimatedPerDay`, `windowDays` and `coveredHours`; `series[]` contains `t`, `min`, `median` and optional `quantity`.
- `/v1/items/{id}?game=forever`: curated catalog names, IDs and vendor facts were checked for all 128 records. Vendor facts are not used for calculations or displayed as profit estimates.

All five category routes returned HTTP 200: fish/catches 76, cloth 6, leather/hides 10, ore 9, herbs 27. Category batches remain below the documented 100-item limit. The current price table cache is shared between categories.

The latest application-route smoke check verified real seven-day history for Stonescale Eel (13422), Linen Cloth (2589), Rugged Leather (8170), Thorium Ore (10620), and Black Lotus (13468), with 152–153 supplied points per item. Estimated daily sales were present in these responses. Actual 24h and 30d requests also succeeded earlier on the same date, before the announced access changes. Only supplied periods/points are shown; access errors remain explicit.

Authentication is server-side `Authorization: Bearer ...`. No real key was supplied in development: keyed access and actual credential rejection are fixture-tested, not real-account tested. From December 10 the documented free key adds thirty-day history; the adapter gates it and handles provider 403 responses.

## What demand means

The demand display uses the provider’s **estimated units sold per day**, never the number of current auctions or the asking price. This is an inferred volume estimate, not confirmed purchased quantities. Listing disappearance can include cancellations. We do not infer extra purchases from falling supply or invent historical daily sales.

- Current supply = current units listed.
- Days of supply = units listed / estimated units sold per day.
- Missing daily estimate = unavailable, not zero.
- Zero estimated daily sales with positive supply = infinite days of supply.
- Sales sample window and coverage are displayed when the individual price response supplies them. Low or missing coverage is warned.
- The optional green line is listed supply history, explicitly not a purchase-volume graph.

Price graphs are genuine line charts using only normalized provider observations. Lowest buyout is neon cyan, market median neon magenta, and supply neon green. Tooltip values include actual timestamps and gold/silver/copper. Missing values are not filled or connected through nulls. Table percentage change is current buyout versus seven-day median, not recent momentum.

## Retention and attribution

Free personal/community use requires attribution. Links appear beside market data, item details and source notes; item campaign links are preserved. No website scraping, EU prices or alternate-market data are used.

From December 10 the terms prohibit retaining answers beyond their Cache-Control lifetime without an appropriate license. The implementation uses memory-only caches, removes expired market/history data, honors Cache-Control/ETag/Retry-After and coalesces identical requests. No auction data goes to localStorage, disk, fixtures or a database. The only current preference saved in localStorage is the selected category. Legacy browser preferences are no longer read.

A still-valid cached answer may be reused during an outage, but an expired answer cannot be displayed as an offline snapshot. Freshness compares actual observation timestamps, not just fetch time. An old observation can be warned even in a newly fetched response. Synthetic demo values are explicitly opt-in and never act as an error fallback.

## Catalog provenance and limits

The original fish/catch catalog selection was researched using Classic source material, including CMaNGOS Classic DB (GPL v3); its original license and copyright notices are retained. Item identities and vendor facts were then checked against Forever metadata. There is no numerical catch, route or farming dataset in the current application. No AidVir source code or unlicensed dataset was copied.

The 128-item catalog is curated and not exhaustive. It includes secondary catches under “Fish & catches,” and hides under leather. Additional Forever-specific goods need verified item identities before inclusion. Catalog facts should be rechecked after patches.

## Verification limits

Automated checks cover currency, category isolation, demand math, sorting, fixed-market parser validation, graph normalization, missing data, provider auth errors, rate limiting and cache expiration. Live route checks passed for all categories and representative histories. Docker/CasaOS deployment and physical iPhone testing have not been performed here. The managed preview server cannot bind its local port, so current browser visual QA is also unverified.
