# CHANGELOG.md

No prior CHANGELOG.md existed at repo root before this entry (there is a separate in-app `/changelog` page at `apps/web/src/app/changelog/page.tsx` with a user-facing version of this history — this file is the repo-level engineering record, not a duplicate). Entries reconstructed from `git log` where not otherwise dated; no release/version numbers exist in this project (no tags, no `CHANGELOG` convention was previously in use) — dates are commit-order, not calendar dates, except where noted.

---

## [b0e446c] — Documentation handoff audit — 2026-08-06

Full repository audit and permanent memory-system creation for AI-agent handoff continuity. **No product behavior was intentionally changed.** Committed 2026-08-06 as `b0e446c` (confirmed committed — not left pending — during the 2026-08-07 checkpoint; earlier drafts of this entry said "Unreleased," which went stale once the commit landed).

**Files created:** `CLAUDE.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `SESSION_LOG.md`, `HANDOFF.md`, this file.

**Files updated:** `README.md` (was stale — said "Phase 1: planning, no code written," corrected to reflect the deployed, feature-complete state).

**Significant problems discovered during the audit:**
- `subscription_entitlements` table has Row Level Security **disabled** on the live production database — a real, currently-unexploited (nothing reads the table) but genuine security gap. Documented, not fixed, per this audit's explicit no-new-behavior-changes scope. See `TASKS.md` `SEC-001`.
- `packages/supabase-types/src/database.ts` (hand-maintained TypeScript types) is missing the `subscription_entitlements` table entirely — confirms the hand-maintenance process has already drifted from the real schema at least once.
- No automated tests, no CI exist anywhere in the project — confirmed via exhaustive search, not assumed.

No product behavior was changed as part of this audit.

---

## [2163b0d] — Favicon update — 2026-08-07

Replaced `apps/web/src/app/favicon.ico` with a multi-resolution icon matching the app's neon-night theme (magenta sparkle on a dark rounded square). Pure asset change, no code touched.

---

## Prior history (reconstructed from `git log`, not independently re-dated)

### Live-hardening pass (post-deployment bug fixes)
- Fixed: YouTube sync videos never actually playing, a browser autoplay-policy interaction (`638931a`).
- Added: persistent navigation bar with a working sign-out button (previously dead code), full neon visual theme redesign, per-user custom background uploads, in-app changelog page (`adb717f`).
- Fixed: guests could never actually join a room via invite link — missing profile-creation step (`2ef8bff`).
- Redesigned: the entire visual theme — discovered the app had been running with zero effective custom branding due to undefined Tailwind theme tokens (`245e8ba`).
- Fixed: room creation completely broken — an RLS `RETURNING`/`SELECT`-policy interaction (`fe5cd2e`, with an intermediate diagnostic commit `5af5cf8`'s follow-up).
- Fixed: the very first user login completely broken — `profiles` table missing an INSERT policy (`5af5cf8`).
- Fixed: a duplicate RLS policy blocking migrations from applying, plus Turborepo cache secret declarations (`e909436`).
- Fixed: `apps/web/.env.example` had been silently excluded from git since Phase 2 due to an overly broad nested `.gitignore` pattern (`e41b196`).
- **First production deployment**: live Supabase project, live LiveKit Cloud project, live Spotify/YouTube API credentials, Vercel deployment with GitHub auto-deploy connected — the point at which all of the above bugs first became discoverable.

### Phase 7 — Safety, sharing, App Store prep (`b40db49`)
Kick/ban/mute/report/block/room-lock moderation system, rate limiting, upload restrictions, room snapshot capture and sharing, privacy/terms pages, mobile's first Settings screen (needed for App Store account-deletion reachability), accessibility pass.

### Phase 6 — Camera effects & games (`85912a3`)
On-device camera filters/backgrounds/face-tracked accessories (web only), `packages/game-sdk`, three games (Tic-Tac-Toe, Trivia, Draw & Guess) with server-validated moves, mobile got Tic-Tac-Toe.

### Phase 5 — Chat, YouTube, Spotify, study mode (`0aa2867`)
Room chat with replies/reactions/mentions/image-upload, synced YouTube/Spotify playback, Pomodoro study mode with streak tracking.

### Phase 4 — Decoration & collaboration (`fb567e4`)
Multi-select/resize/rotate/layer/undo-redo on the room canvas, shared drawing layer, sticky notes, room version history + restore, decoration asset library and templates (placeholder art, not a real Kenney import).

### Phase 3 — Voice & video (`622f883`)
LiveKit voice/video integration, draggable camera bubbles, screen share, distance-based spatial audio.

### Phase 2 — Foundation (`7a989fe`)
Monorepo scaffold, email/password + magic-link + guest auth, room creation/invites, first version of the room canvas.

### Phase 1 — Planning (`01a8b69`)
Product requirements, architecture, data model, security model, sync protocol, and review documents — no application code, planning only.
