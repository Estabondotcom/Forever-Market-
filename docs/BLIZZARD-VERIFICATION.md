# Verify your Blizzard developer client

Blizzard credentials are optional and server-only. This command is discovery, not an enabled auction collector. It never changes the app's fixed AHledger market or replaces missing data.

## Windows setup (Node.js 24)

Open PowerShell in your existing Forever-Market- repository folder:

```powershell
git pull
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

Add your own values, save and close Notepad:

```dotenv
BLIZZARD_CLIENT_ID=your_client_id
BLIZZARD_CLIENT_SECRET=your_client_secret
```

Do not send this file, screenshots of it, the secret, or an OAuth token in chat. `.env.local` is ignored by Git. Do not put credentials in GitHub Pages, committed files or `NEXT_PUBLIC_` variables.

Run:

```powershell
npm run verify:blizzard
```

The command obtains a temporary application token, verifies US Forever Normal ruleset ID 2, and lists the returned auction houses. It prints only a diagnostic report; it saves neither credentials nor market data. The report may safely be shared after checking that it contains no personal information. Do not run with shell tracing or HTTP debug logging enabled.

## Interpret the result

- Authentication passed: your client can obtain a token.
- Ruleset Normal: the request reached the expected ruleset endpoint.
- Houses listed: the auction-house index is accessible.
- **Market mapping UNVERIFIED:** this is expected. Multiple Horde houses may have identical names. Community reports say different rulesets can return the same houses, so requesting ruleset 2 alone does not establish the correct market. Do not select the first Horde result or combine them all.

An explicitly chosen candidate can be tested without claiming it is the correct market:

```powershell
npm run verify:blizzard -- --house NUMERIC_ID_FROM_THE_REPORT
```

Replace the placeholder with a returned Horde house ID. This makes additional read-only calls and prints listing counts plus provider cache/freshness headers. An empty snapshot is distinct from an unavailable/malformed response. Listing access alone does not prove current freshness or the game's market mapping.

Before enabling a collector we must independently establish which Horde house corresponds to US Normal, verify actual observation freshness and repeated updates, inspect expiry semantics for turnover estimates, and confirm Blizzard's applicable retention/usage terms. Failed or ambiguous checks must not silently enable collection. No historical demand exists until an approved collector is implemented and runs; this command does not provide sales counts.

## Troubleshooting

- Missing credentials: check `.env.local` in the repository root.
- HTTP 401: check the client ID/secret. Never share the secret when reporting an error.
- HTTP 403: the API refused access; credentials alone do not guarantee this game endpoint is supported.
- HTTP 404: route or data unavailable. These Forever routes remain community-documented and may change.
- HTTP 429: wait before retrying; no automatic retry loop is used.
- Network/timeout: check connectivity and retry later.

## Evidence and limitations

Community endpoint research:
- https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334 (November 6 update)
- https://github.com/cnanas/Wow-Forever-Auction (API notes)

The verifier uses `dynamic-forever-us`, `/data/wow/ruleset/2` and `/data/wow/ruleset/2/auctions/` (the index's trailing slash matters). These are not presented as officially documented Forever support. No user credentials were supplied to the development environment. Authentication, access errors, response validation and reporting are fixture-tested; a real authenticated Blizzard request has **not** been performed here.
