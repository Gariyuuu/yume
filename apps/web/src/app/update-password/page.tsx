import { requireUser } from "@/lib/auth/session";
import { UpdatePasswordForm } from "./update-password-form";

export default async function UpdatePasswordPage() {
  // Reachable both by a normal signed-in user changing their password and by
  // someone who just landed here via a password-recovery email link (which
  // establishes a session through /auth/callback before redirecting here).
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-room-bg px-4">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
