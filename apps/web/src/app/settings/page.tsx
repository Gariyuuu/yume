import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BackgroundUpload } from "./background-upload";
import { BlockedUsersList } from "./blocked-users";
import { DangerZone } from "./danger-zone";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocked_id, profiles!user_blocks_blocked_id_fkey(display_name)")
    .eq("blocker_id", profile.id);
  const blocked = (blocks ?? [])
    .filter((b) => b.profiles)
    .map((b) => ({ id: b.blocked_id, display_name: b.profiles!.display_name }));

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav current="settings" />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm displayName={profile.display_name} avatarUrl={profile.avatar_url} />
        </CardContent>
      </Card>

      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <BackgroundUpload profileId={profile.id} currentUrl={profile.background_url} />
        </CardContent>
      </Card>

      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="/settings/export"
            className="text-sm underline underline-offset-4"
            download
          >
            Download a copy of your data
          </a>
        </CardContent>
      </Card>

      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Blocked users</CardTitle>
        </CardHeader>
        <CardContent>
          <BlockedUsersList initialBlocked={blocked} />
        </CardContent>
      </Card>

      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Legal &amp; support</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy policy
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms of service
          </Link>
          <Link href="/changelog" className="underline underline-offset-4">
            Changelog
          </Link>
          <a href="mailto:support@yume.app" className="underline underline-offset-4">
            Contact support
          </a>
        </CardContent>
      </Card>

        <Separator />

        <Card className="rounded-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DangerZone />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
