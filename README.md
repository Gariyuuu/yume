# Yume (codename — placeholder, not final branding)

A persistent virtual room for small friend groups: voice, video, camera bubbles,
room decoration, drawing, YouTube, Spotify, study mode, and small multiplayer
games. Spiritual successor to the general idea of Here.fm — original branding,
UI, code, and art.

This repo is currently in **Phase 1: planning**. No production code has been
written yet. See [docs/phase-1](docs/phase-1) for the full architecture and
implementation plan.

## Phase 1 documents

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

## Status

Public repo. No secrets are committed — see `.gitignore` and
`docs/phase-1/04-security-rls.md` for where credentials live (local `.env`,
Vercel project env vars, Supabase project settings, EAS secrets).
