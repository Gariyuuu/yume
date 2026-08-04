# 09 — App Store Risk Review

Working rule reminder: **re-check the current App Store Review Guidelines
before submission** — this review captures the areas of the guidelines
that are directly relevant to this app's feature set as understood today;
it is not a substitute for reading the live guidelines at submission time.

## 1. User-generated content & live communication (Guideline 1.2, Safety)

This app has live voice/video, chat, drawing, and uploaded images between
users — squarely in "UGC + live communication" territory, which draws the
most Apple review scrutiny. Required, all tracked in the brief and
reflected in the data model/checklist:

- A mechanism to filter objectionable content (moderation log, message
  deletion).
- A mechanism to report content/users (`reports` table + in-app flow).
- A mechanism to block abusive users (`user_blocks` table).
- A published method of contact for users to reach a real person
  (support URL/email — needed before submission).
- Ability for the host/moderator to remove content and eject users.

Because rooms are private/invite-only by default with no public discovery,
this reduces (but does not eliminate) the "unmoderated public content"
risk profile Apple weighs most heavily — worth stating explicitly in App
Review notes at submission time, since reviewers otherwise default to
treating any UGC+chat app as public-scale.

## 2. Age rating

Live voice/video chat with strangers-adjacent risk (even though this app
is friend-invite-only) typically pushes age rating to 12+ or 17+ depending
on how Apple's questionnaire treats "user-generated content" and
"unrestricted web access" (the YouTube `WKWebView` embed and any
outbound links count here). Plan for a 12+ or 17+ rating rather than 4+;
this affects App Store metadata, not engineering, but should be decided
before store listing assets are produced.

## 3. Camera / microphone / photo library permissions (Guideline 5.1.1)

Each usage description string must explain the actual in-context reason,
not a generic placeholder — required strings:

- `NSCameraUsageDescription` — video chat and camera-bubble/filters.
- `NSMicrophoneUsageDescription` — voice chat.
- `NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription` —
  uploading images/decorations and saving room snapshots.
- If a broadcast extension is shipped: the extension's own Info.plist
  entries and `NSUserNotificationsUsageDescription` if snapshot/share
  flows trigger local notifications.

Clear, in-product just-in-time explanations (not just the system prompt
text) are expected practice and reduce review friction.

## 4. Screen sharing / ReplayKit broadcast extension

Full-device screen share requires a **Broadcast Upload Extension** —a
second binary target bundled in the same app, with its own entitlement
and a small amount of UI (the system broadcast picker). This is
additional App Store submission surface (a second target to configure,
sign, and describe in review notes) and should be scoped explicitly in
Phase 3, not discovered late. In-app-only screen recording (`RPScreenRecorder`,
sharing just this app's own content) is simpler but does not satisfy the
brief's "share your screen" expectation for showing e.g. a browser or
another app — plan for the full extension.

## 5. In-app purchase (future premium tier)

Not needed for v1 (free, no paywall), but planning ahead per the brief's
entitlement-infrastructure requirement: **any future digital subscription
sold to iOS users must go through Apple's In-App Purchase (StoreKit)**
per Guideline 3.1.1 — a web-only Stripe subscription cannot be the payment
path for iOS users unless it qualifies under one of Apple's external-
purchase-link exceptions, which are narrow and jurisdiction-specific and
should be reconfirmed against current guidelines at that time. The
`subscription_entitlements` table (`source: 'app_store' | 'stripe' | ...`)
is deliberately shaped to support StoreKit-issued entitlements on iOS and
a separate web billing path, reconciled server-side, so this isn't a
schema migration later — just don't assume Stripe-on-iOS is viable without
re-checking guidelines when premium actually ships.

## 6. Privacy manifest & nutrition label

Required for apps using certain "required reason" APIs and any third-
party SDKs that themselves ship privacy manifests (LiveKit's RN SDK,
Supabase's client, any analytics added later) — Apple's privacy manifest
requirements have been tightening; confirm the current required-reason
API list and third-party SDK signature requirements before submission.
Nutrition label (App Privacy details in App Store Connect) must
accurately reflect: account data collected, camera/mic data (processed
live for calls, not stored raw), uploaded images (stored in Supabase
Storage), and any Spotify/YouTube account linkage.

## 7. Minimum functionality (Guideline 4.2)

Not a real risk here given the feature depth, but worth noting the app
must function as a complete, native experience — the YouTube `WKWebView`
embed and Spotify App Remote hand-off must feel like integrated features,
not the entire app being "a wrapped website," which this architecture
already avoids (native RN UI throughout, WebView scoped to one embedded
player component).

## 8. Guest access & account requirements

Apple generally expects apps not to force account creation for basic
functionality where avoidable (Guideline 5.1.1(v) territory is about
account deletion, but reviewers do also look favorably on genuine guest
support) — this app's guest-join-via-invite flow is a plus here, not a
risk, and should be highlighted in review notes/demo account instructions.

## 9. Account deletion (Guideline 5.1.1(v))

Full in-app account deletion (not just deactivation, not "email support to
delete") is a hard requirement for any app with account creation — already
in the data model (`profiles` cascade) and checklist; must be reachable
within the app's own settings UI, not buried behind a web-only flow.

## 10. App Review notes to prepare

- A demo account (or clear guest-join instructions) since reviewers can't
  easily test a friends-only, invite-link-based product otherwise.
- A short explanation of the moderation model (kick/ban/report/block) and
  why public discovery is intentionally absent (reduces reviewer's default
  "unmoderated public UGC" assumption, per §1).
- Explicit note that Spotify/YouTube integrations use only official APIs
  and do not download/rehost media, addressing a common rejection vector
  for media-adjacent apps.
