import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { spotifyClientId, spotifyClientSecret } from "@/lib/spotify/env";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [csrfToken, roomId] = (state ?? "").split(":");
  const cookieCsrf = request.cookies.get("spotify_oauth_csrf")?.value;

  if (!code || !roomId || !csrfToken || csrfToken !== cookieCsrf) {
    return NextResponse.redirect(`${origin}/rooms?spotify_error=invalid_state`);
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${spotifyClientId()}:${spotifyClientSecret()}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/spotify/callback`
    })
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${origin}/room/${roomId}?spotify_error=token_exchange_failed`);
  }

  const tokenBody = await tokenResponse.json();

  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` }
  });
  const profileBody = await profileResponse.json();

  const supabase = await createClient();
  await supabase.from("spotify_connections").upsert(
    {
      profile_id: user.id,
      spotify_user_id: profileBody.id,
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      scope: tokenBody.scope,
      expires_at: new Date(Date.now() + tokenBody.expires_in * 1000).toISOString(),
      is_premium: profileBody.product === "premium"
    },
    { onConflict: "profile_id" }
  );

  const response = NextResponse.redirect(`${origin}/room/${roomId}?spotify_connected=1`);
  response.cookies.delete("spotify_oauth_csrf");
  return response;
}
