import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Yume to join your persistent rooms."
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
