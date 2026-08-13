import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";
import { JoinForm } from "./join-form";

// Deliberately generic and constant, regardless of token validity — never
// renders a room name (unmoderated user text) to an unauthenticated
// unfurler. Inherits the site-level opengraph-image from the root layout
// since no opengraph-image.tsx exists in this route segment.
export const metadata: Metadata = {
  title: { absolute: "You're invited — Yume" },
  description: "Someone invited you to a room on Yume.",
};

type Preview =
  | { ok: true; roomName: string; requiresPassword: boolean }
  | { ok: false; message: string };

async function loadPreview(token: string): Promise<Preview> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/join-room?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const body = await response.json();

    if (body.status !== "ok") {
      return { ok: false, message: describePreviewError(body.reason) };
    }

    return { ok: true, roomName: body.room_name, requiresPassword: body.requires_password };
  } catch {
    return {
      ok: false,
      message: "Couldn't reach the server. Check your Supabase project is configured."
    };
  }
}

function describePreviewError(reason: string): string {
  switch (reason) {
    case "expired":
      return "This invite link has expired.";
    case "revoked":
      return "This invite link has been revoked.";
    case "room_full":
      return "This room is full.";
    default:
      return "This invite link isn't valid.";
  }
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const preview = await loadPreview(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-room-bg px-4">
      <Card className="w-full max-w-sm rounded-card">
        <CardHeader>
          <CardTitle className="text-2xl">
            {preview.ok ? `Join "${preview.roomName}"` : "Invite"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preview.ok ? (
            <JoinForm
              token={token}
              requiresPassword={preview.requiresPassword}
              isSignedIn={Boolean(user && !user.is_anonymous)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{preview.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
