import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link for your Yume account."
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
