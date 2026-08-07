# ROADMAP.md — Product Roadmap

No time estimates exist anywhere in this repository — none are invented here either. Priority/difficulty/risk below are qualitative judgments based on repository evidence, not committed dates.

---

## Current milestone

**Post-MVP hardening.** All 7 originally-planned phases (`docs/phase-1/11-implementation-checklist.md`) are built and deployed. The current work is finding and fixing bugs that only surface against a live backend (RLS gaps, browser-policy interactions) — not new feature development.

- **Objective:** A group of 2–12 friends can create a room, decorate it, and have a real multi-person session (voice + at least one activity) without a crash or unrecoverable desync — this is the project's own success signal from `docs/phase-1/01-prd.md` §7.
- **Status:** Everything except a real multi-person live test (`TASKS.md` `TEST-001`) has been verified.
- **Dependencies:** none blocking.

## Next milestone

**Close the two known open gaps + real multi-user verification**, per `TASKS.md`:
- `SEC-001` (RLS gap) — priority: High, difficulty: trivial, risk: low.
- `BUG-002` (owner-approval invite flow) — priority: High, difficulty: medium (needs UI + a notification/approval mechanism that doesn't exist yet), risk: low.
- `TEST-001` (real two-person test) — priority: High, difficulty: trivial (no code), risk: none, but currently the single biggest unknown in the project.
- **Definition of done:** all three closed/completed, `TASKS.md` updated to reflect it.

## MVP completion

Already reached, by the project's own definition (`docs/phase-1/01-prd.md` §5 "Must have before App Store submission (Phase 6–7)" — camera filters, 3 games, snapshot/sharing, safety tooling, accessibility pass, App Store compliance artifacts — all present in the repository). What remains before an actual App Store *submission* (not MVP completion) is external/non-technical: Apple Developer Program enrollment.

## Post-MVP

- **iOS shipping.** Requires (in order): Apple Developer Program enrollment ($99/yr, external), a real EAS build (`eas build --profile production`, never run), TestFlight distribution, App Store Connect metadata (icons/screenshots/privacy nutrition label — `docs/app-store-review-notes.md` has the draft reviewer notes but real assets don't exist), then submission. **Difficulty: medium-high** (mostly process/account setup, not code — the app code itself is ready per `FEATURES.md`). **Risk:** medium — no native build has ever run in this environment, so it's plausible (not confirmed) that a real Xcode/EAS build surfaces native-module issues (LiveKit, react-native-webrtc, react-native-skia) that pure TypeScript typechecking can't catch.
- **Legal review of `/privacy` and `/terms`.** Currently accurate-but-not-lawyer-reviewed drafts, explicitly labeled as such on the pages. Priority: medium (blocks a real, non-friends-only public launch; doesn't block continued private/beta use).
- **Real Kenney decoration asset import** (`FEAT-001`). Priority: low, purely cosmetic.
- **Extend data export coverage** (`FEAT-002`). Priority: low, mostly a compliance nicety beyond what currently exists.

## Long-term ideas

Recovered from `docs/phase-1/01-prd.md`'s "explicitly deferred (not cut, just not v1)" list — these were deliberate future-scope decisions made during original planning, not vague wishlist items:

- **Premium tier activation.** Infrastructure exists (`subscription_entitlements` table) but zero gating logic anywhere. Needs: an `is_premium()`-equivalent check wired into whatever features would be gated, a real payment provider integration (none exists — no Stripe, no App Store IAP, nothing), and (for iOS) StoreKit compliance per Guideline 3.1.1 since Apple requires any iOS subscription to go through StoreKit, not a web payment flow.
- **Website ad system.** Not started at all (verified — zero code references found). Original constraint if ever built: must never render over video/chat/screen-share/private content, per the original product brief.
- **Public room discovery.** Explicitly rejected as against the product's "small private groups" positioning (`docs/phase-1/01-prd.md`'s non-goals). Not a roadmap item — an intentional non-goal.
- **Android.** Explicitly out of scope for v1. No Android-specific code exists beyond what Expo's cross-platform layer provides incidentally (the mobile app.json has some `android` config, but this has never been built/tested for Android).

## Optional improvements

- Trivia/Draw & Guess on mobile (`FEAT-003`).
- Camera effects on mobile (needs a native Vision/Core Image equivalent — nothing started).
- Automated tests + CI (currently zero of either — see `TESTING.md`). Given the project's proven history of bugs that only surface live, integration-style tests against a real (or at least local) Supabase instance would have the highest value-per-effort here, more than unit tests of pure functions.
- Local Supabase development environment (`supabase start`, needs Docker — not available in the environment this project was built in, so never set up; would remove the "every migration goes straight to production" risk noted in `ARCHITECTURE.md`).

## Out-of-scope features

Per the original product brief (`docs/phase-1/01-prd.md` "Non-goals"), still accurate:

- Not a Discord replacement (no DM system, no multi-server model).
- Not a public social network (no discovery, no public profiles searchable outside a room).
- Not a broadcast/streaming platform for large audiences.
- Not a general-purpose whiteboard tool (drawing is embedded in a room, not standalone).
- Not a music/video hosting service (YouTube/Spotify are strictly official-API pass-throughs, confirmed by inspection — no rehosting of any kind found in the codebase).
