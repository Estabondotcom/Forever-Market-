# Curated tracking catalog

The collector keeps only the original 71 farming resources plus the 170 additional items below: **241 total**, not every auction item. All additional identities were checked through AHledger’s documented `/v1/items/{id}?game=forever` endpoint on 2026-11-17. Individual source URLs and verification dates are in [crafting-watchlist.json](../src/data/crafting-watchlist.json); the original 71 are in [resources.json](../src/data/resources.json).

“Common-use” is an editorial selection of repeat-use consumables and crafting inputs, not a measured best-seller ranking or an item-quality filter. Metadata confirms identity, not that every recipe or acquisition source is currently available. No recipe tables, price snapshots or completed-sale claims were copied into the catalog. Healing potions are not labeled Alchemy-only: Forever moves the ordinary healing line to First Aid. Some names differ from Classic (for example item 9206 is Elixir of Greater Strength).

## Search and privacy

The five farming tabs keep their original resource lists and start with nothing selected. Extra goods are discoverable only through Search; the full catalog is not dumped into a farming tab. Search starts empty. Type at least two characters (or an exact item ID), select a suggestion, and it is added with both graph metrics enabled. Remove a row, turn either metric off, or clear the list. Up to 20 added items can be compared together.

Each page has its own temporary comparison list in React memory. It survives navigation between tabs on that page, but clears on reload/new page. No account, shared list, server-side favorites, localStorage or sessionStorage list is used. Only the existing farming-category preference may remain in localStorage. Two browsers/devices do not share a list. Normal data lookup GETs contain chosen IDs; this is not an authentication/privacy boundary against someone who has access to the same open browser page.

Collection runs for all 241 allowed IDs regardless of any visitor’s comparison choices. New IDs need their own initial baseline and a subsequent suitable changed snapshot before a demand interval exists. Historical price requests remain bounded to known catalog IDs. Unknown IDs and oversized requests are rejected.

## Expansion, storage and retention

The allowlist is compiled into the collector image. On expansion, existing history is preserved; a full snapshot is requested on the next scheduled collection without the old validators so newly tracked IDs can establish baselines. If its timestamp matches the previous snapshot, only newly added IDs get baseline points—existing items are not counted twice and no historical turnover is invented. Removing an ID from both curated files drops it from retained baselines/samples on the next worker startup. Normal users’ list changes do not change the allowlist.

The worker remains a single writer to the same named Docker volume, keeps only the latest allowed listing baseline plus up to 30 days of per-item metrics, and retains no seller/character information or credentials in history. The public reader is bounded to 250,000 samples and 100 MiB to accommodate the expanded catalog. Actual disk size depends on active listing counts and numeric precision; the earlier 30–100 MB estimate is a planning range, not a measurement of a full month. The commodity feed alone is used; absence there does not prove an item has no regular-auction listing or no recipe.

Do not use `docker compose down -v` during updates.

## Source references and limits

- [AHledger API documentation](https://ahledger.com/developers): item identities and attribution links, not an archived market dataset.
- [Forever alchemy changes](https://mobalytics.gg/wow-forever/guides/alchemy-profession-guide): profession differences used for context.
- [Forever Guide](https://foreverguide.net/professions/alchemy/): recipe-line differences and new consumable families used for context.

This is an independently curated item-name/ID allowlist. No third-party calculator implementation, recipe table or unlicensed dataset was imported. “Metadata verified” does not assert popularity, currently active auctions, drop rates, recipe availability or exact purchases.

## Potions and utility consumables (35)

| Item | Verified item ID |
| --- | ---: |
| Free Action Potion | 5634 |
| Frenzy Potion | 250940 |
| Great Rage Potion | 5633 |
| Greater Arcane Protection Potion | 13461 |
| Greater Fire Protection Potion | 13457 |
| Greater Frost Protection Potion | 13456 |
| Greater Healing Potion | 1710 |
| Greater Mana Potion | 6149 |
| Greater Nature Protection Potion | 13458 |
| Greater Shadow Protection Potion | 13459 |
| Greater Stoneshield Potion | 13455 |
| Healing Potion | 929 |
| Invisibility Potion | 9172 |
| Lesser Healing Potion | 858 |
| Lesser Invisibility Potion | 3823 |
| Lesser Mana Potion | 3385 |
| Limited Invulnerability Potion | 3387 |
| Magic Resistance Potion | 9036 |
| Major Frenzy Potion | 250943 |
| Major Healing Potion | 13446 |
| Major Mana Potion | 13444 |
| Major Mender's Potion | 250949 |
| Mana Potion | 3827 |
| Mighty Rage Potion | 13442 |
| Minor Healing Potion | 118 |
| Minor Mana Potion | 2455 |
| Potion of Demon Slaying | 9224 |
| Purification Potion | 13462 |
| Spellblasting Potion | 250934 |
| Superior Frenzy Potion | 250942 |
| Superior Healing Potion | 3928 |
| Superior Mana Potion | 13443 |
| Superior Mender's Potion | 250948 |
| Swiftness Potion | 2459 |
| Swim Speed Potion | 6372 |

## Elixirs and flasks (17)

| Item | Verified item ID |
| --- | ---: |
| Arcane Elixir | 9155 |
| Elixir of Agility | 8949 |
| Elixir of Brute Force | 13453 |
| Elixir of Defense | 8951 |
| Elixir of Fire Power | 6373 |
| Elixir of Frost Power | 17708 |
| Elixir of Giant Growth | 6662 |
| Elixir of Greater Agility | 9187 |
| Elixir of Greater Defense | 13445 |
| Elixir of Greater Intellect | 9179 |
| Elixir of Greater Strength | 9206 |
| Elixir of Ogre Strength | 3391 |
| Elixir of the Mongoose | 13452 |
| Flask of Distilled Wisdom | 13511 |
| Flask of Supreme Power | 13512 |
| Flask of the Titans | 13510 |
| Greater Arcane Elixir | 13454 |

## Food and bandages (21)

| Item | Verified item ID |
| --- | ---: |
| Dragonbreath Chili | 12217 |
| Grilled Squid | 13928 |
| Heavy Linen Bandage | 2581 |
| Heavy Mageweave Bandage | 8545 |
| Heavy Runecloth Bandage | 14530 |
| Heavy Silk Bandage | 6451 |
| Heavy Wool Bandage | 3531 |
| Hot Smoked Bass | 13929 |
| Linen Bandage | 1251 |
| Mageweave Bandage | 8544 |
| Nightfin Soup | 13931 |
| Poached Sunscale Salmon | 13932 |
| Runecloth Bandage | 14529 |
| Runn Tum Tuber Surprise | 18254 |
| Sagefish Delight | 21217 |
| Savory Deviate Delight | 6657 |
| Silk Bandage | 6450 |
| Smoked Desert Dumplings | 20452 |
| Smoked Sagefish | 21072 |
| Thistle Tea | 7676 |
| Wool Bandage | 3530 |

## Oils and weapon enhancements (13)

| Item | Verified item ID |
| --- | ---: |
| Blackmouth Oil | 6370 |
| Brilliant Mana Oil | 20748 |
| Brilliant Wizard Oil | 20749 |
| Dense Sharpening Stone | 12404 |
| Dense Weightstone | 12643 |
| Elemental Sharpening Stone | 18262 |
| Fire Oil | 6371 |
| Frost Oil | 3829 |
| Oil of Immolation | 8956 |
| Shadow Oil | 3824 |
| Solid Sharpening Stone | 7964 |
| Solid Weightstone | 7965 |
| Stonescale Oil | 13423 |

## Processed materials and dyes (25)

| Item | Verified item ID |
| --- | ---: |
| Arcane Crystal | 12363 |
| Arcanite Bar | 12360 |
| Bolt of Linen Cloth | 2996 |
| Bolt of Mageweave | 4339 |
| Bolt of Runecloth | 14048 |
| Bolt of Silk Cloth | 4305 |
| Bolt of Woolen Cloth | 2997 |
| Bronze Bar | 2841 |
| Cerulean Dye | 249409 |
| Copper Bar | 2840 |
| Cured Heavy Hide | 4236 |
| Cured Rugged Hide | 15407 |
| Cured Thick Hide | 8172 |
| Dark Iron Bar | 11371 |
| Gold Bar | 3577 |
| Iron Bar | 3575 |
| Magenta Dye | 249430 |
| Mithril Bar | 3860 |
| Mooncloth | 14342 |
| Refined Deeprock Salt | 15409 |
| Silver Bar | 2842 |
| Steel Bar | 3859 |
| Thorium Bar | 12359 |
| Tin Bar | 3576 |
| Truesilver Bar | 6037 |

## Enchanting materials (24)

| Item | Verified item ID |
| --- | ---: |
| Dream Dust | 11176 |
| Greater Astral Essence | 11082 |
| Greater Eternal Essence | 16203 |
| Greater Magic Essence | 10939 |
| Greater Mystic Essence | 11135 |
| Greater Nether Essence | 11175 |
| Illusion Dust | 16204 |
| Large Brilliant Shard | 14344 |
| Large Glimmering Shard | 11084 |
| Large Glowing Shard | 11139 |
| Large Radiant Shard | 11178 |
| Lesser Astral Essence | 10998 |
| Lesser Eternal Essence | 16202 |
| Lesser Magic Essence | 10938 |
| Lesser Mystic Essence | 11134 |
| Lesser Nether Essence | 11174 |
| Nexus Crystal | 20725 |
| Small Brilliant Shard | 14343 |
| Small Glimmering Shard | 10978 |
| Small Glowing Shard | 11138 |
| Small Radiant Shard | 11177 |
| Soul Dust | 11083 |
| Strange Dust | 10940 |
| Vision Dust | 11137 |

## Elemental and other reagents (18)

| Item | Verified item ID |
| --- | ---: |
| Breath of Wind | 7081 |
| Core of Earth | 7075 |
| Deeprock Salt | 8150 |
| Elemental Air | 7069 |
| Elemental Earth | 7067 |
| Elemental Fire | 7068 |
| Elemental Water | 7070 |
| Essence of Air | 7082 |
| Essence of Earth | 7076 |
| Essence of Fire | 7078 |
| Essence of Undeath | 12808 |
| Essence of Water | 7080 |
| Globe of Water | 7079 |
| Heart of Fire | 7077 |
| Heart of the Wild | 10286 |
| Living Essence | 12803 |
| Swiftthistle | 2452 |
| Wildvine | 8153 |

## Engineering materials and consumables (17)

| Item | Verified item ID |
| --- | ---: |
| Coarse Stone | 2836 |
| Dense Blasting Powder | 15992 |
| Dense Stone | 12365 |
| Goblin Sapper Charge | 10646 |
| Gold Power Core | 10558 |
| Heavy Stone | 2838 |
| Iron Grenade | 4390 |
| Mithril Casing | 10561 |
| Mithril Tube | 10559 |
| Rough Stone | 2835 |
| Solid Blasting Powder | 10505 |
| Solid Dynamite | 10507 |
| Solid Stone | 7912 |
| Thorium Grenade | 15993 |
| Thorium Tube | 16000 |
| Thorium Widget | 15994 |
| Unstable Trigger | 10560 |

