# DEPLOYMENT.md — Deployment Reference

## Hosting

- **Web:** Vercel, project name `yume`, org `garywangsmes-8349s-projects` (project ID `prj_EMWNZdGKclGUk8JzhXCH7IvwLPSB`, team ID `team_gofGt63nGGecSpDl9hBbsFWm` — visible in `.vercel/project.json` at repo root, not sensitive).
- **Backend:** Supabase, project ref `jnercugeinepkgmbxdvn`, region `us-west-2`.
- **Voice/video:** LiveKit Cloud, `wss://yume-p9t15gah.livekit.cloud`.
- **Mobile:** no hosting — never built/submitted anywhere.

## Production URL

**https://yume-gray.vercel.app** — this is a Vercel-assigned alias (the clean short name was available at claim time), not a custom domain. No custom domain is configured. This exact URL is baked into `NEXT_PUBLIC_SITE_URL` (Vercel env var) and must be updated everywhere it's referenced if the domain ever changes: Vercel env var, Supabase Auth's `site_url`/`uri_allow_list` config (see below), and the Spotify Developer Dashboard's redirect URI.

## The monorepo Root Directory problem (read this before touching Vercel settings)

This is a pnpm/Turborepo monorepo with the deployable app in `apps/web`, not at repo root. Getting Vercel to build it correctly required a specific, non-obvious sequence:

1. **Deploying from `apps/web` directly** (`cd apps/web && vercel deploy`) fails — it only uploads that subdirectory, so `workspace:*` dependencies on `packages/*` can't resolve (`npm error Unsupported URL Type "workspace:"`).
2. The fix is to deploy **from the repo root** (so the whole monorepo, including the root `pnpm-lock.yaml` and `packages/*`, gets uploaded) with the Vercel project's **Root Directory** setting pointed at `apps/web` (so Vercel's framework detection and build step run inside that folder).
3. **`vercel project update` has no CLI flag for Root Directory.** The only way found to set it was a direct call to the Vercel REST API: `PATCH https://api.vercel.com/v9/projects/{idOrName}?teamId={teamId}` with body `{"rootDirectory": "apps/web"}`, authenticated with the same token the Vercel CLI itself uses (readable from `~/Library/Application Support/com.vercel.cli/auth.json` on the machine where the CLI is logged in).
4. After setting Root Directory, the Build Command also needed correcting to `cd ../.. && pnpm exec turbo run build --filter=@yume/web` (paths become relative to Root Directory once it's set), and Install Command / Output Directory were reset to Vercel's auto-detect (`vercel project update --auto-detect install-command --auto-detect output-directory`).

**Do not "fix" these settings back to Vercel dashboard defaults** — the current configuration is deliberately hand-tuned to work around this exact limitation. If a build starts failing with `workspace:` protocol errors or "No Next.js version detected," check whether Root Directory/Build Command have reverted, before assuming the codebase is broken.

## GitHub auto-deploy

The Vercel project is connected to `github.com/Gariyuuu/yume`'s `main` branch — **every push to `main` triggers an automatic production deployment.** There is no staging environment, no preview-then-promote gate, no manual approval step. `git push origin main` deploys to production, same as running `vercel deploy --prod` manually. Be deliberate about what gets pushed to `main`.

## Build command

```
cd ../.. && pnpm exec turbo run build --filter=@yume/web
```
(set on the Vercel project, per the Root-Directory workaround above — this is **not** just `next build`, and should not be simplified to that without re-verifying the monorepo build still works).

## Environment variables (Vercel)

Set via `vercel env add <NAME> production` (or the dashboard) — see `CLAUDE.md`'s environment table for the full list and purpose of each. All 7 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY`) are set on the live Vercel project with real values as of this audit.

**`turbo.json`'s `build.env` array must list every server-only secret** (`SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY` are currently listed) — otherwise Turborepo's remote/local build cache won't invalidate when a secret's value changes, silently serving a build made with old credentials. `NEXT_PUBLIC_*` vars don't need to be listed — Next.js's own build-time inlining is auto-detected by Turborepo.

## Deployment protection (SSO wall) — a recurring Vercel gotcha on this account

New Vercel projects on this account **default to SSO deployment protection enabled** (`ssoProtection.deploymentType: "all_except_custom_domains"`), which redirects anyone without a login to this specific Vercel team to a login wall instead of the app — invisible/confusing since there's no custom domain here, so it would otherwise block literally every visitor. **This was found and disabled** (`vercel project protection disable yume --sso`). If the production URL ever appears to redirect to a Vercel/SSO login page for a visitor who isn't the project owner, check this setting first.

## Supabase deployment (separate from the web deploy — no automation connects them)

Migrations and Edge Functions are **not** part of the Vercel build/deploy pipeline. They are applied manually:

```bash
# One-time per machine: log in with a personal access token
# (from supabase.com/dashboard/account/tokens — NOT the project's anon/service-role key)
npx supabase login --token <token>
npx supabase link --project-ref jnercugeinepkgmbxdvn

# Apply pending migrations (goes straight to the live/only database — no staging)
npx supabase db push

# Deploy Edge Functions (all, or one by name)
npx supabase functions deploy
npx supabase functions deploy join-room

# Set Edge Function secrets (LiveKit — required for mint-livekit-token/moderate-participant to work)
npx supabase secrets set LIVEKIT_URL="wss://..." LIVEKIT_API_KEY="..." LIVEKIT_API_SECRET="..."
```

**No local Supabase instance exists** in this development environment (`supabase start` needs Docker, unavailable — every `functions deploy` run prints `WARNING: Docker is not running`, which is expected and not itself an error). This means:
- There is no way to test a migration against a disposable database before it hits the real one.
- `supabase/seed.sql` cannot be applied via `supabase db seed` (also needs a local/linked-with-Docker setup) — it was applied once by hand via the Supabase Management API's raw SQL query endpoint (`POST https://api.supabase.com/v1/projects/{ref}/database/query` with `{"query": "<contents of seed.sql>"}`, authenticated with the same personal access token). If a fresh Supabase project is ever provisioned, this is how to re-apply it.
- `packages/supabase-types/src/database.ts`'s `gen` script (`supabase gen types typescript --local`) has never successfully run — the types are hand-maintained (see `DATABASE.md`).

## Migration order

Sequential, by filename number (`0001` through `0021` as of this audit). `supabase db push` applies whatever hasn't been applied yet, in order. **Never edit an already-applied migration file** — see `DECISIONS.md` ADR-006 for why this specifically matters (the project already correctly distinguished "safe to edit in place because it never successfully applied" from "must be a new migration" once, mid-project).

## Domain configuration

None — using Vercel's default `*.vercel.app` alias. No DNS configuration exists for this project.

## Mobile deployment

**Has never happened.** `apps/mobile/eas.json` has `development`/`preview`/`production` build profiles configured but **no `submit` block** — the real iOS submit configuration (`ascAppId`/`appleTeamId`/etc.) needs an actual Apple Developer Program account to set up correctly via `eas submit`'s interactive flow, which was never available in this environment. No `eas build` has ever been run — not even a development build. See `docs/app-store-review-notes.md` for the App Store submission prep that *has* been done (privacy manifest starter config, review notes draft) versus what's still needed (real Apple Developer enrollment, an actual build, TestFlight, App Store Connect metadata/screenshots).

## Rollback procedure

**Web:** `vercel rollback` (or `vercel promote <previous-deployment-url>`) — standard Vercel rollback, not specifically tested during this project but is Vercel's documented mechanism. Since GitHub auto-deploy means every `main` push is a new production deployment, `git revert` + push is the more natural rollback for a code-level regression.

**Database:** **no tested rollback procedure exists.** A bad migration would need a hand-written corrective migration (e.g. a `DROP COLUMN`/reversing migration) — there is no automatic "undo the last migration" tooling, and no local sandbox to test the fix in before applying it to the only database that exists.

## Health checks / post-deployment verification

No automated health check exists. Manual verification after a deploy:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://yume-gray.vercel.app/sign-in   # expect 200
vercel ls yume    # confirm newest deployment shows "Ready"
```
Beyond that, a manual smoke test per `TESTING.md`'s checklist is the real verification step — HTTP 200 on the sign-in page proves the build deployed, not that any feature actually works.

## Deployment checklist

1. `cd apps/web && pnpm run typecheck && pnpm run lint && pnpm run build` — must pass locally first.
2. Review `git status`/`git diff` — no secrets, no unintended files.
3. Commit, push to `main` (this deploys automatically) OR run `vercel deploy --prod --yes` from repo root manually.
4. If the change included a new/changed migration: `npx supabase db push` **separately** — this is not automatic.
5. If the change added a new secret env var: set it in Vercel (`vercel env add`) and, if server-only, add it to `turbo.json`'s `build.env`.
6. Wait for the Vercel deployment to show "Ready" (`vercel ls yume`).
7. Manually verify via `curl` (HTTP 200 check above) and, for anything RLS/auth-adjacent, the live-testing methodology in `TESTING.md`.
8. Update `PROJECT_STATE.md`/`TASKS.md`/`SESSION_LOG.md` per `CLAUDE.md`'s rules.
