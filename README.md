# Yume (codename — placeholder, not final branding)

A persistent virtual room for small friend groups: voice, video, camera bubbles,
room decoration, drawing, YouTube, Spotify, study mode, and small multiplayer
games. Web (Next.js) + iOS (Expo/React Native), one shared Supabase backend.
Original branding, UI, code, and art — not a Here.fm clone.

**Status: all 7 planned phases are built and the app is live in production**
at **https://yume-gray.vercel.app**. iOS has never been built/submitted (no
Apple Developer account yet). See below for where everything is documented.

## Start here

This repository is the permanent source of project memory — it's meant to let
any developer or AI coding agent pick up work with minimal rediscovery. Read
**[HANDOFF.md](HANDOFF.md)** first if you're new to this codebase, then
**[CLAUDE.md](CLAUDE.md)** for the full operating manual. The full documentation
set:

| File | What's in it |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Start here — quick orientation + a copy-ready onboarding prompt |
| [CLAUDE.md](CLAUDE.md) | Primary operating manual — stack, commands, conventions, critical rules |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Exact current state — what works, what's unverified, next actions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, request/data flow, diagrams |
| [FILE_MAP.md](FILE_MAP.md) | Where to find/change things |
| [FEATURES.md](FEATURES.md) | Every feature's real status (verified/mostly-complete/broken/etc.) |
| [TASKS.md](TASKS.md) | Active task queue |
| [ROADMAP.md](ROADMAP.md) | What's next, deferred, and out of scope |
| [DECISIONS.md](DECISIONS.md) | Architectural decision log, including real bugs found and fixed |
| [DATABASE.md](DATABASE.md) | Schema reference with an ER diagram |
| [API_REFERENCE.md](API_REFERENCE.md) | Server Actions, Route Handlers, Edge Functions |
| [UI_SYSTEM.md](UI_SYSTEM.md) | Design system, theme tokens, components |
| [SECURITY.md](SECURITY.md) | Defensive security review |
| [TESTING.md](TESTING.md) | Test strategy (there isn't one — read why) and a manual smoke-test checklist |
| [DEPLOYMENT.md](DEPLOYMENT.md) | How this actually gets deployed, including real gotchas |
| [CHANGELOG.md](CHANGELOG.md) | Engineering changelog |
| [SESSION_LOG.md](SESSION_LOG.md) | Chronological log of AI sessions working on this repo |

## Original Phase 1 planning documents

Written before any code existed — historical context for *why* things were
designed this way. The actual implementation is the source of truth where
these have drifted; see `ARCHITECTURE.md`/`DATABASE.md`/etc. for what's
actually true today.

1. [Product Requirements](docs/phase-1/01-prd.md)
2. [System Architecture](docs/phase-1/02-architecture.md)
3. [Data Model](docs/phase-1/03-data-model.md)
4. [Security Model & RLS](docs/phase-1/04-security-rls.md)
5. [Room Sync Protocol](docs/phase-1/05-sync-protocol.md)
6. [Web/iOS Feature Parity Matrix](docs/phase-1/06-feature-parity-matrix.md)
7. [API Capability Review](docs/phase-1/07-api-capability-review.md)
8. [Licensing Review](docs/phase-1/08-licensing-review.md)
9. [App Store Risk Review](docs/phase-1/09-app-store-risk-review.md)
10. [Folder Structure](docs/phase-1/10-folder-structure.md)
11. [Implementation Checklist](docs/phase-1/11-implementation-checklist.md)
12. [App Store Review Notes](docs/app-store-review-notes.md) (written later, during Phase 7)

## Quick start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local       # fill in real values — see CLAUDE.md
cp apps/mobile/.env.example apps/mobile/.env.local
cd apps/web && pnpm dev      # http://localhost:3000
```

Full command reference, environment variable details, and everything else in
[CLAUDE.md](CLAUDE.md).

## Status

Public repo. No secrets are committed — see `.gitignore` (both the root one
and `apps/web/.gitignore` — there's a documented incident of the nested one
silently excluding a file, see `DECISIONS.md`) and `SECURITY.md` for where
real credentials live (local `.env.local`, Vercel project env vars, Supabase
project settings, Supabase Edge Function secrets).
