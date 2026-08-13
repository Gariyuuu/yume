import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Starfield } from "@/components/starfield";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Yume — persistent rooms for your friends";
const description =
  "A persistent virtual room for small friend groups — voice and video calls, room decoration, drawing, synced YouTube and Spotify, and study mode.";

export const metadata: Metadata = {
  metadataBase: new URL("https://yume-gray.vercel.app"),
  title: { default: title, template: "%s | Yume" },
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Yume",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Starfield />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
