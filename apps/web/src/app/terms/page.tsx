import Link from "next/link";

export const metadata = { title: "Terms of Service — Yume" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="text-muted-foreground underline underline-offset-4">
        ← Home
      </Link>
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-muted-foreground">
        This is a draft prepared for App Store review, not a lawyer-reviewed legal document. Replace it
        before a real public launch.
      </p>

      <h2 className="font-semibold">What Yume is</h2>
      <p>
        Yume is a private, invite-only space for small groups of friends to hang out — voice/video, room
        decoration, drawing, shared media, and games. Rooms are not publicly discoverable; you need an
        invite link to join one.
      </p>

      <h2 className="font-semibold">Acceptable use</h2>
      <ul className="list-disc pl-5">
        <li>No harassment, hate speech, or illegal content.</li>
        <li>No impersonating another person.</li>
        <li>Only share media you have the rights to share.</li>
        <li>Don&apos;t attempt to disrupt the service (spam, abuse of rate limits, etc.).</li>
      </ul>

      <h2 className="font-semibold">Moderation</h2>
      <p>
        Room owners and moderators can mute, kick, or ban participants, remove content, and lock a room to
        new members. You can report content or block another user at any time — see{" "}
        <Link href="/settings" className="underline underline-offset-4">
          Settings
        </Link>
        . We may suspend accounts that violate these terms.
      </p>

      <h2 className="font-semibold">Accounts</h2>
      <p>
        You&apos;re responsible for activity under your account. Guests joining via an invite link get a
        temporary account tied to that session. You can delete your account at any time from Settings.
      </p>

      <h2 className="font-semibold">Third-party services</h2>
      <p>
        Voice/video runs on LiveKit. Music and video playback use the official Spotify and YouTube APIs
        under their respective terms — we don&apos;t rehost or redistribute their content.
      </p>

      <h2 className="font-semibold">Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; during this pre-launch phase, without warranty of any
        kind, to the fullest extent permitted by law.
      </p>

      <h2 className="font-semibold">Contact</h2>
      <p>
        <a href="mailto:support@yume.app" className="underline underline-offset-4">support@yume.app</a>
      </p>
    </div>
  );
}
