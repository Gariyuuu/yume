import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Yume account and start a persistent room for your friends."
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
