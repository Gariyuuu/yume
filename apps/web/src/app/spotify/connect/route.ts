import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { SPOTIFY_SCOPES, spotifyClientId } from "@/lib/spotify/env";

/**
 * Starts the Authorization Code flow — see
 * https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 * (verify current details before redeploying). `roomId` is threaded
 * through `state` so the callback knows which room to redirect back to.
 */
export async function GET(request: NextRequest) {
  await requireUser();

  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "missing_room_id" }, { status: 400 });
  }

  const csrfToken = randomBytes(16).toString("hex");
  const state = `${csrfToken}:${roomId}`;

  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", spotifyClientId());
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", `${request.nextUrl.origin}/spotify/callback`);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("spotify_oauth_csrf", csrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600
  });
  return response;
}
