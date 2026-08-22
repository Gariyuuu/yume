import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-muted-foreground underline underline-offset-4">
        ← Home
      </Link>
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-muted-foreground">
        Last updated: this is a draft prepared for App Store review — it accurately
        describes what the app collects and why, but has not been reviewed by a
        lawyer. Replace this notice, and have counsel review the whole page, before
        a real public launch.
      </p>

      <h2 className="font-semibold">What we collect</h2>
      <ul className="list-disc pl-5">
        <li>Account data: your display name, avatar, and email (or, for guests, just a display name).</li>
        <li>Room data: rooms you create or join, messages you send, drawings and notes you make.</li>
        <li>
          Live audio/video: when you turn on your mic or camera, your voice/video is transmitted to other
          participants via LiveKit for the duration of the call; it is not recorded or stored by us.
        </li>
        <li>Uploaded images: chat images and avatars you upload, stored in Supabase Storage.</li>
        <li>
          Third-party linkage: if you connect Spotify, we store an OAuth token to control playback on your
          behalf. YouTube/Spotify search queries are sent to those providers&apos; official APIs.
        </li>
        <li>Usage data: presence status, study-session stats, and moderation logs (for room owners/moderators).</li>
      </ul>

      <h2 className="font-semibold">What we don&apos;t do</h2>
      <ul className="list-disc pl-5">
        <li>We don&apos;t sell your data.</li>
        <li>We don&apos;t run ads today (an ad system exists in the code but is switched off — see below).</li>
        <li>Camera effects (filters, backgrounds, etc.) run entirely on your device — raw camera frames are never uploaded for processing.</li>
      </ul>

      <h2 className="font-semibold">Your controls</h2>
      <p>
        You can export a copy of your data or delete your account at any time from{" "}
        <Link href="/settings" className="underline underline-offset-4">
          Settings
        </Link>
        . Deleting your account removes your profile and room memberships; content you own in shared rooms
        is either deleted (if only you could see it) or kept with the author removed (if others rely on it,
        e.g. shared decorations).
      </p>

      <h2 className="font-semibold">Future: ads and subscriptions</h2>
      <p>
        This app ships with inactive infrastructure for an optional premium tier and a website ad system,
        neither of which is turned on. If either is enabled in the future, this policy will be updated
        first, and ads will never be shown over video, chat, screen-share, or other private content.
      </p>

      <h2 className="font-semibold">Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:support@yume.app" className="underline underline-offset-4">support@yume.app</a>.
      </p>
    </div>
  );
}
