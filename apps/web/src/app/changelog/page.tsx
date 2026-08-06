import Link from "next/link";

export const metadata = { title: "Changelog — Yume" };

const ENTRIES = [
  {
    title: "Navigation, sign-out, neon theme, custom backgrounds",
    date: "Live hardening pass",
    items: [
      "Added a persistent nav bar (Rooms / Settings / Sign out) to every page — there was previously no way back to the rooms list from Settings, and no way to sign out at all (the sign-out action existed in the code since Phase 2 but was never wired to a button).",
      "Reworked the whole visual theme: neon magenta/cyan glow palette, a real background image (a hand-authored SVG nebula, since no image-generation tool is available here), animated shooting stars.",
      "Settings → Appearance: upload your own background image, applied everywhere for you specifically.",
      "This page."
    ]
  },
  {
    title: "Found and fixed while testing the live app for real",
    date: "Post-launch",
    items: [
      "Guests could never actually join a room via an invite link — the very first join always failed because nothing created their profile record first. Fixed and verified end-to-end with a brand-new test account.",
      "Room creation failed for everyone due to a subtle Postgres RLS interaction with Supabase's \"return the row I just created\" behavior. Fixed by letting a room's owner always read their own room.",
      "The very first account action (creating a profile) was blocked — the database had rules for reading and updating a profile, but none for creating one.",
      "Verified live: mute, kick, and ban all work correctly, including that a banned person is actually blocked from rejoining.",
      "Verified live: voice/video token issuing works.",
      "Applied the Phase 4 decoration templates and asset library to the live database — they existed in the code but had never actually been loaded in.",
      "Fixed a bug where apps/web's own .env.example had been silently excluded from the repository since Phase 2."
    ]
  },
  {
    title: "Phase 7 — Safety, sharing, App Store prep",
    date: "Build",
    items: [
      "Kick / ban / mute / report / block / room lock, all enforced by the database, not just the UI.",
      "Room snapshot capture and sharing (web + mobile).",
      "Rate limiting on joins, invites, reports, and guest messages.",
      "Privacy policy and terms pages; mobile got its first Settings screen (needed for App Store review — account deletion has to be reachable from inside the app).",
      "Accessibility pass: labeled icon-only buttons, fixed color-only status indicators."
    ]
  },
  {
    title: "Phase 6 — Camera effects & games",
    date: "Build",
    items: [
      "On-device camera filters, backgrounds, and face-tracked accessories (web) — nothing ever leaves your browser.",
      "Tic-Tac-Toe, Trivia, and Draw & Guess, all with server-validated moves.",
      "Mobile got a real Tic-Tac-Toe (the other two need work mobile doesn't have yet)."
    ]
  },
  {
    title: "Phase 5 — Chat, YouTube, Spotify, study mode",
    date: "Build",
    items: [
      "Room chat with replies, reactions, @mentions, and image uploads.",
      "Synced YouTube and Spotify playback.",
      "Study mode: synced Pomodoro timers, focus status, streak tracking."
    ]
  },
  {
    title: "Phase 4 — Decoration & collaboration",
    date: "Build",
    items: [
      "Multi-select, resize/rotate, layering, undo/redo on the room canvas.",
      "A shared drawing layer and sticky notes.",
      "Room history with restore, and starter decoration templates."
    ]
  },
  {
    title: "Phase 3 — Voice & video",
    date: "Build",
    items: [
      "Real-time voice and video via LiveKit, with draggable camera bubbles.",
      "Distance-based spatial audio — quieter the further apart your bubbles are."
    ]
  },
  {
    title: "Phase 2 — Accounts, rooms, invites",
    date: "Build",
    items: [
      "Email/password and guest accounts, room creation, and invite links (password, expiry, capacity).",
      "The first version of the room canvas."
    ]
  },
  {
    title: "Phase 1 — Planning",
    date: "Build",
    items: ["Product, architecture, data model, and security design — before any code was written."]
  }
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/rooms" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Rooms
      </Link>
      <h1 className="text-2xl font-semibold">Changelog</h1>
      <p className="text-sm text-muted-foreground">
        Everything that&rsquo;s been built so far, most recent first.
      </p>

      <div className="flex flex-col gap-8">
        {ENTRIES.map((entry) => (
          <div key={entry.title} className="rounded-card border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.date}</p>
            <h2 className="mt-1 text-lg font-semibold">{entry.title}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
