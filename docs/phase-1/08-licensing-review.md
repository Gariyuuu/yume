# 08 — Licensing Review

## 1. Policy

An asset is only added to the decoration library if its exact license is
confirmed for **commercial use in a shipped product**, and a corresponding
row is added to both the `asset_licenses` table
([03-data-model.md](03-data-model.md)) and the repo-root
`ASSET_LICENSES.md` before the asset is referenced anywhere in app code or
`room_templates`. "Labeled free" is not sufficient — see brief's explicit
instruction. Every entry needs: source URL, creator, license, download
date, whether attribution is required (and the exact required text), and
any modification notes.

## 2. Approved sources for v1

- **Kenney** (kenney.nl) — CC0 for essentially the entire catalog
  (confirm per-pack on kenney.nl, as CC0 is the stated default but should
  be checked per download since Kenney occasionally has exceptions).
  Priority packs per the brief: Background Elements, Generic Items,
  Isometric Miniature packs, Roguelike Indoors. CC0 means no attribution
  is legally required, but crediting Kenney in an in-app "credits" screen
  is good practice and costs nothing.
- **OpenGameArt.org** — mixed licensing per-asset (CC0, CC-BY, CC-BY-SA,
  GPL, etc.). Only usable when the *specific* asset page is checked and is
  CC0 or another commercially-compatible permissive license — CC-BY-SA and
  GPL-family licenses are avoided for visual assets since they'd impose
  share-alike/copyleft obligations on a proprietary game/decoration
  library. Each OpenGameArt asset considered gets its own
  `asset_licenses` row with the license actually stated on that asset's
  page, not an assumption based on the site in general.

## 3. Code-adjacent licenses relevant to this project

| Dependency | License | Usage | Compatible? |
|---|---|---|---|
| MediaPipe (Tasks Vision) | Apache 2.0 | Face landmarks / segmentation on web | Yes |
| Excalidraw (concepts only, not code/assets copied) | MIT | Referenced only as a UX pattern inspiration for the drawing layer, per brief's instruction to integrate drawing "naturally into the room" rather than embed it | N/A — not importing Excalidraw itself; if any Excalidraw *code* is reused later, MIT is permissive and compatible, but track it as a real dependency with attribution if that happens |
| Phaser (if used for web games) | MIT | Draw & Guess / Trivia rendering on web | Yes |
| LiveKit client SDKs | Apache 2.0 | Core media transport | Yes |
| Supabase client SDKs | MIT/Apache 2.0 | Core backend access | Yes |

## 4. Original asset style requirement

Per the brief: do not ship a mix of pixel-art, realistic, and isometric
styles without a deliberate system. **Decision for v1:** adopt a single
consistent flat/soft-shaded 2D isometric-lite style (compatible with
Kenney's isometric miniature packs as a starting reference point, not a
copy) as the room-decoration visual language, and a simple rounded
flat-vector style for UI chrome/icons (distinct from the room-content
style so the "editing chrome" reads as separate from "room content" —
same distinction React Konva/Skia naturally encourages). A short visual
style guide (palette, stroke weight, shading rules) should be produced
before the asset library grows past the initial template set, so
community/future contributions stay consistent.

## 5. `ASSET_LICENSES.md`

Created at the repo root (`/ASSET_LICENSES.md`) as required by the brief.
Starts empty with the schema below; every asset import PR must add a row
here in the same change.
