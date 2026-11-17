# Forever: Farmer’s Market — interactive mockup

**[Open the preview](https://estabondotcom.github.io/Forever-Market-/mockup/)**

- Uses the same React dashboard as the live application.
- All prices, demand and histories are **synthetic sample data**.
- Try Cloth, Fish, Herbs, Ore and Skinning.
- Toggle each item’s price and demand independently.
- One graph combines price history, demand history and item comparison.
- Start with 7 daily points, then switch to 30 daily points.
- Solid lines show prices; dotted lines show synthetic demand history.
- Each item has a consistent neon color.
- Comparisons reset when changing tabs.

![Verified desktop preview](preview.jpg)

No server, API key or running WoW client is needed. This preview is not the live market feed.

Regenerate from the repository root with `npm run build:mockup`. Commit generated assets with source changes; CI checks they match.

Live AHledger data has price history but no historical sales-rate series. The live app leaves past demand blank and marks only the current rolling estimate at today. This preview uses synthetic demand histories, clearly labeled, to show the combined design.
