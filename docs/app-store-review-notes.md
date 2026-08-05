# App Store review notes (draft)

Prepared per [docs/phase-1/09-app-store-risk-review.md](phase-1/09-app-store-risk-review.md) §10.
This is the notes-to-reviewer draft plus a running list of what's real vs.
still needed before an actual TestFlight/App Store submission — nothing
here has been submitted or tested against a live Apple Developer account.

## Notes to include in the App Review submission form

> Yume is a private, invite-only app for small groups of friends (2-12
> people) — there is no public room directory or discovery feature by
> design; every room requires an invite link to join. To review:
>
> 1. Sign up (or use the demo account below) and create a room.
> 2. Use "Invite" to generate a link, then open it in a second
>    browser/device (or as a guest — guest join needs no account, just a
>    display name) to see the joined-room experience.
> 3. Moderation: room owners/moderators can mute, kick, or ban a
>    participant from their bubble's menu, lock the room to new joiners,
>    and review reports/moderation history from the shield icon in the
>    room header. Any member can block or report another member.
> 4. Voice/video runs on LiveKit; screen sharing, room decoration,
>    drawing, and three built-in games are also available from the room
>    toolbar.
>
> Demo account: _add real credentials here before submitting_ — either a
> seeded demo account or explicit guest-join instructions, per the risk
> review's §8 recommendation to highlight guest access as a review
> positive.

## What's real and ready

- Kick/ban/mute/report/block, room lock, and a moderation log are fully
  implemented and RLS-enforced (`supabase/migrations/0016_moderation_rls.sql`,
  `supabase/functions/moderate-participant`) — see the Phase 7 commit for
  detail.
- In-app account deletion and data export are reachable from Settings on
  **both** web and mobile (mobile's Settings screen was net-new this
  phase specifically to satisfy App Store Guideline 5.1.1(v), which
  requires deletion to be reachable from the app itself, not a web-only
  flow).
- Camera/microphone permission strings in `apps/mobile/app.json` are
  contextual, not generic.
- Privacy policy and terms pages exist at `/privacy` and `/terms` (web),
  linked from Settings on both apps — **these are drafts that describe
  the app's real data flows accurately but have not been reviewed by a
  lawyer.** Get real legal review before public launch.
- `apps/mobile/app.json` declares a starting `privacyManifests` entry
  (UserDefaults, reason `CA92.1`, needed by AsyncStorage/session
  persistence). Per Expo's own guidance, Apple's static-analysis of
  third-party CocoaPods' bundled `PrivacyInfo.xcprivacy` files is
  unreliable — expect TestFlight processing emails calling out additional
  required-reason APIs from LiveKit's or Supabase's native dependencies
  once a real build exists, and fold those into this same config block.
- `apps/mobile/eas.json` has `development`/`preview`/`production` build
  profiles. It deliberately has **no `submit` block** — the exact iOS
  submit field shape (`ascAppId`/`appleTeamId`/etc.) needs an actual
  Apple Developer account to configure correctly via `eas submit
  --platform ios`'s interactive setup, and this environment never had
  one to verify against; hand-typing those fields without verification
  would risk exactly the kind of invented-capability mistake this
  project has avoided everywhere else.

## Known gaps — honest, not silently faked

- **Upload scanning**: Storage buckets now enforce file-type/size limits
  server-side (`supabase/migrations/0017_upload_restrictions.sql`), but
  there is no malware/content-moderation scanning of uploaded bytes — no
  such API is wired up (or credentialed) in this environment.
- **Rate limiting**: implemented for join attempts, invite creation,
  report submission, and guest message send (see
  `0016_moderation_rls.sql`). Limits (e.g. 20 messages/minute for guests)
  are reasonable starting points, not load-tested.
- **Owner-approval invites**: still stuck at `pending_approval` with no
  approval UI — a pre-existing gap from Phase 2, not addressed this
  phase either.
- **Accessibility**: icon-only controls across both apps now have
  accessible names (`aria-label` on web, `accessibilityLabel`/long-press
  affordances on mobile); the speaking indicator and mute/status
  indicators are no longer color-only. Full keyboard-operable canvas
  dragging (web) and a systematic VoiceOver/TalkBack pass on every mobile
  screen have **not** been done — spot-checked, not run through
  automated tooling (no axe/Lighthouse available in this environment).
- **Screen sharing on iOS**: per the risk review §4, a real broadcast
  extension (second signed target) is needed for full-device screen
  share on iOS — not built; mobile screen share is out of scope for now
  (web has it via the browser's native screen-share picker, which needs
  no extension).
- Nothing in this phase has run against a live Supabase project, a real
  LiveKit Cloud room, or an actual Apple Developer/App Store Connect
  account — same standing caveat as every phase since Phase 2.
