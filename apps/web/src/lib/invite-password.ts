import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashing for optional room-invite passwords (§3 of docs/phase-1/04-security-rls.md).
 * Intentionally duplicated (not shared as a package) in
 * supabase/functions/join-room/invite-password.ts, which runs on Deno as a
 * separate deployment target from this Next.js app — not worth a shared
 * package for one ~15-line function used in exactly two places.
 */
export function hashInvitePassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyInvitePassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, 64);

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
