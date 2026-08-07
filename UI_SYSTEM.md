# UI_SYSTEM.md — Design System Reference

## Layout system

- **Web:** no shared layout shell beyond `apps/web/src/app/layout.tsx` (fonts + background + toaster) and, since the recent nav addition, `apps/web/src/components/app-nav.tsx` — a top nav bar rendered explicitly at the top of `/rooms`, `/room/[roomId]`, and `/settings` (not a shared layout wrapping all three; each page renders it itself). Public pages (`/privacy`, `/terms`, `/changelog`, sign-in/sign-up) do **not** render `AppNav` — they have their own minimal "← Home"/"← Rooms" back-links instead.
- **Mobile:** no navigation library, no shared chrome component — each screen (`AuthScreen`, `RoomsScreen`, `RoomDetailScreen`, `SettingsScreen`) is a standalone `View` composed directly in `App.tsx`'s conditional render tree.

## Navigation

- **Web:** `apps/web/src/components/app-nav.tsx` — brand link (→ `/rooms`), Rooms, Settings, Sign out (a `<form action={signOutAction}>`, not a client-side click handler — this is a real Server Action form submission).
- **Mobile:** hand-rolled `useState` screen switching in `App.tsx`. `RoomsScreen` has its own header row with Settings/Sign-out links.

## Page structure (web)

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Redirect gateway only |
| `/sign-in`, `/sign-up`, `/reset-password` | `app/(auth)/*` | Shared `(auth)` layout |
| `/rooms` | `app/rooms/page.tsx` | Room list + create form |
| `/room/[roomId]` | `app/room/[roomId]/page.tsx` | The main app surface — canvas, call, chat, every feature dialog |
| `/settings` | `app/settings/page.tsx` | Profile, appearance, data, blocked users, legal, danger zone |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | Public invite landing page |
| `/privacy`, `/terms`, `/changelog` | `app/{privacy,terms,changelog}/page.tsx` | Static-ish content pages |
| `/update-password` | `app/update-password/page.tsx` | Post-reset-link password entry |

## Reusable components (`apps/web/src/components/ui/`)

shadcn/ui built on **Base UI** (`@base-ui/react`), not Radix — this matters if consulting shadcn docs/examples, which usually assume Radix. Components present: `Button` (variants: default/outline/secondary/ghost/destructive/link; sizes: default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg), `Card` (+Header/Title/Description/Content/Footer), `Dialog` (+Trigger/Content/Header/Title/Footer/Close), `Input`, `Label`, `Badge` (variants: default/secondary/destructive/outline/ghost/link), `Separator`, `Tabs` (+List/Trigger/Content), `Toaster` (sonner wrapper).

No `Select`, `Textarea`, `Checkbox`, `Switch`, or `DropdownMenu` component exists — places that need these use plain native `<select>`/`<textarea>`/`<input type="checkbox">` elements styled inline (see `apps/web/src/components/call/call-controls.tsx`'s device-select dropdowns, `apps/web/src/components/moderation/report-dialog.tsx`'s reason `<select>`).

## Theme system

**No light/dark toggle.** A single fixed theme is defined in `apps/web/src/app/globals.css` under both `:root` and `.dark` (currently identical values in both — `next-themes` is an installed dependency but **no `<ThemeProvider>` is ever mounted anywhere**, so `.dark` never actually gets applied by any toggle; it's present only because `sonner`'s toast component reads a theme value internally).

**Palette ("neon night"):**

| Token | Value | Used for |
|---|---|---|
| `--background` | `#07040f` | Page background (under the nebula image) |
| `--card` / `--popover` | `#150a26` | Cards, dialogs |
| `--foreground` | `#f5f0ff` | Primary text |
| `--primary` | `#e935e0` (magenta) | Primary buttons, glow accents |
| `--secondary` | `#1c0f38` | Secondary surfaces |
| `--muted-foreground` | `#b79ce0` | De-emphasized text |
| `--destructive` | `#ff4d7e` | Destructive actions |
| `--border` / `--input` | `#3d2568` / `#3a2160` | Structural borders — deliberately **not** full neon magenta, to avoid every input/divider looking like hazard tape (see `apps/web/src/app/globals.css` comment) |
| `--ring` | `#22e5ff` (cyan) | Focus rings |
| `--room-bg` | `#120a24` | Wrapper behind the Konva room canvas |
| `--neon-magenta`/`--neon-cyan`/`--neon-violet` | `#e935e0`/`#22e5ff`/`#a855f7` | Raw values for the `color-mix()`-based glow utility classes |
| `brand-50` … `brand-900` | `#faf5ff` … `#4c1d76` | A violet scale, anchored on the same purple family mobile already used in hardcoded hex (`#9f22cd`/`#bb3af0`/`#6b1988`) |

**Custom radius tokens:** `--radius-card` (`1.375rem`, → `rounded-card` utility), `--radius-bubble` (`9999px`, → `rounded-bubble` utility, fully round camera bubbles).

**Glow effects:** applied via plain CSS (not Tailwind utilities) in `globals.css`, targeting: `.neon-text-brand` (nav brand text, `text-shadow`), `.rounded-card` (box-shadow glow, intensifies on `:hover`), `[data-slot="dialog-content"]`/`[data-slot="popover-content"]` (glow border), `[data-slot="button"].bg-primary` (glow on primary buttons — note: selected via the literal `bg-primary` Tailwind class name being present in the DOM, **not** a `data-variant` attribute, since Base UI's `Button` component doesn't expose variant as a data attribute — verified by reading `apps/web/src/components/ui/button.tsx` directly before writing this selector).

**Background image:** `apps/web/public/nebula-bg.svg` — hand-authored (no image-generation tool was available), referenced as `<body>`'s `background-image`, `background-attachment: fixed`, `background-size: cover`. Overridable per-user: `apps/web/src/components/starfield.tsx` fetches the signed-in user's `profiles.background_url` client-side and, if set, layers it full-bleed with a `bg-background/55` readability overlay, on top of (not replacing) the same animated star/shooting-star layer.

## Typography

`Geist` (sans) and `Geist_Mono` via `next/font/google`, loaded in `apps/web/src/app/layout.tsx`. No separate heading font (`--font-heading` is aliased to `--font-sans`). No typographic scale system beyond Tailwind's default `text-*` utilities used ad hoc per component.

## Spacing, breakpoints, animations

- **Spacing:** Tailwind's default scale, no custom overrides detected.
- **Breakpoints:** Tailwind defaults (`sm`/`md`/`lg`/etc.), used sparingly — most layouts are single-column with `flex-wrap`, not a deliberate responsive grid system. No dedicated mobile-web breakpoint strategy was found; the web app is primarily built assuming a desktop-ish viewport (the room canvas is a fixed 1200×800 coordinate space — see `apps/web/src/components/room-canvas/room-dimensions.ts`).
- **Animations:** `tw-animate-css` (installed, provides `data-open`/`data-closed` enter/exit animation utilities used by `Dialog`). Custom `@keyframes shooting-star` and `@keyframes star-twinkle` in `globals.css` for the background. No general-purpose animation/transition library (no Framer Motion).

## Icon system

`lucide-react` throughout the web app, imported per-component (no icon-sprite/registry file). Mobile uses emoji characters inline (e.g. `"🔇 "` prefix for muted participants in `ParticipantTile.tsx`) — no icon library on mobile.

## Image asset conventions

- Room decoration art: `data:image/svg+xml,...` URIs embedded directly in `room_assets.asset_url` — no Storage bucket required to render them (see `ASSET_LICENSES.md`).
- User-uploaded content (avatars, chat images, custom backgrounds): real Storage bucket URLs, rendered via plain `<img>` tags with an `eslint-disable-next-line @next/next/no-img-element` comment explaining why `next/image` isn't used (arbitrary external/user-controlled URLs).
- App icons (`apps/mobile/assets/*`): Expo-default-generated placeholders, never replaced with real branding.

## Modals / dialogs

All web dialogs use the shared `Dialog` component (Base UI). Mobile uses React Native's built-in `<Modal>` component directly (`ChatModal`, `GamesModal`, `ParticipantMenu` all follow this pattern) — no shared mobile modal wrapper component exists.

## Notifications (toasts)

`sonner`, mounted once in `apps/web/src/app/layout.tsx` as `<Toaster/>`. Used for Server Action error/success feedback throughout. Mobile uses React Native's `Alert.alert()` for the equivalent purpose — no toast library on mobile.

## Forms

Mostly native HTML forms with Server Actions (`<form action={someAction}>`), some using `useActionState`/`useTransition` for pending states. No form-validation library (no react-hook-form/Formik) — validation is Zod schemas re-run server-side inside each Server Action, with the error message returned in the action's `{error?: string}` state object.

## Loading / empty / error states

No consistent, shared skeleton/spinner component — each feature implements its own (e.g. `"Loading room…"` text, `RoomCanvasLoader`'s Next.js `dynamic(..., {loading: () => <div>Loading room…</div>})`). Empty states are plain conditional text (`"No rooms yet — create one to invite your friends."`, `"Nothing queued yet."`) — functional but not a designed pattern. Error states are `sonner` toasts (web) or `Alert.alert` (mobile) — no in-line form-field error UI beyond a `text-destructive` paragraph under a form.

## Accessibility

Icon-only buttons across both apps have `aria-label`/`title` (added in a dedicated pass across ~20 previously-unlabeled controls — see `DECISIONS.md`). Color-only status indicators were fixed where found (speaking indicator uses both a color change *and* a border-width change; muted icon has an accompanying `sr-only` label). **This was a spot-check pass, not a systematic audit** — no automated tool (axe, Lighthouse) has been run in this environment, and no keyboard-navigation or screen-reader walkthrough of the full app has been performed. Treat accessibility as "meaningfully better than default, not verified compliant."

## Browser support

Not explicitly targeted or tested — built and used against a modern Chromium-based browser during development. No polyfills beyond what Next.js/Turbopack includes by default. The YouTube autoplay-policy fix (`DECISIONS.md` ADR-008) is specifically a Chrome/Safari-documented behavior; Firefox's policy is similar but was not independently verified.

## Known visual inconsistencies

- Mobile and web share no design-token system — mobile's purple is hardcoded hex per-file, web's is CSS custom properties. A change to one does not affect the other.
- `rooms/page.tsx`'s JSX indentation is slightly inconsistent after the recent nav-bar wrapping edit (cosmetic only, not a functional bug — noted here so a future formatting pass doesn't mistake it for something meaningful).
