import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";

/**
 * Persistent top-level nav — every authenticated page (rooms list, a
 * room, settings) renders this so there's always a way back to "home"
 * (the rooms list) and a real sign-out, neither of which existed before:
 * signOutAction() was written back in Phase 2 but never wired to a
 * button anywhere, and there was no shared header at all outside a
 * single room page's own tool row.
 */
export function AppNav({ current }: { current: "rooms" | "room" | "settings" }) {
  return (
    <nav className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur-sm sm:px-6">
      <Link href="/rooms" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
        <span className="neon-text-brand text-base">✦ Yume</span>
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/rooms">
          <Button size="sm" variant={current === "rooms" ? "secondary" : "ghost"}>
            Rooms
          </Button>
        </Link>
        <Link href="/settings">
          <Button size="sm" variant={current === "settings" ? "secondary" : "ghost"}>
            Settings
          </Button>
        </Link>
        <form action={signOutAction}>
          <Button size="sm" variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </nav>
  );
}
