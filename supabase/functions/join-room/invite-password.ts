// Deno runtime — see apps/web/src/lib/invite-password.ts for why this is a
// deliberate duplicate rather than a shared package.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function verifyInvitePassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, salt, 64);

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// Exported for symmetry/tests even though this function only ever verifies;
// hashing happens in the Next.js app (apps/web) when an invite is created.
export function hashInvitePassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
