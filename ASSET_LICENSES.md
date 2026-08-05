# Asset Licenses

Every decoration/UI asset imported into this project must have a row
here, added in the same change that adds the asset. See
[docs/phase-1/08-licensing-review.md](docs/phase-1/08-licensing-review.md)
for the sourcing policy. "Labeled free" alone is never sufficient — the
exact license of the exact asset must be confirmed.

## Format

| Asset | Source URL | Creator | License | Download Date | Attribution Required | Attribution Text | Modification Notes |
|---|---|---|---|---|---|---|---|
| _(example — remove once real assets are added)_ `sofa_01.png` | https://kenney.nl/assets/example-pack | Kenney | CC0 | 2026-08-03 | No | — | Recolored to match room palette |

## Current status: placeholder art, not a Kenney import

The seven decoration assets seeded in `supabase/seed.sql` (Sofa, Cozy rug,
Potted plant, Floor lamp, Framed poster, Window, Picnic blanket) are
**original, hand-authored flat-SVG shapes**, not sourced from Kenney or
anywhere else — they exist so the asset picker, room templates, and
decoration toolset have something real to work with. They are embedded
directly as `data:image/svg+xml,...` URIs in `room_assets.asset_url`, so
no Storage bucket is required to see them render.

| Asset | Source URL | Creator | License | Download Date | Attribution Required | Attribution Text | Modification Notes |
|---|---|---|---|---|---|---|---|
| Sofa, Cozy rug, Potted plant, Floor lamp, Framed poster, Window, Picnic blanket (all 7) | https://github.com/Gariyuuu/yume | Yume project | CC0 (original work) | 2026-08-05 | No | — | Hand-authored placeholders; see note below |

**This is a known gap, not a finished asset library.** The actual Kenney
CC0 import described in
[docs/phase-1/08-licensing-review.md](docs/phase-1/08-licensing-review.md)
(Background Elements, Generic Items, Isometric Miniature packs, Roguelike
Indoors) requires downloading real binary asset packs and uploading them
to Supabase Storage — neither is possible in the environment these
placeholders were built in. Before relying on this as the real asset
library: download the actual Kenney packs, verify each asset's license on
its Kenney page, upload to the `room-assets` Storage bucket, add one row
per asset here with real values, and retire the placeholder rows above
(or keep them as an explicit "sketch" style option — that's a product
call, not a technical one).
