import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yume-gray.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/changelog", "/privacy", "/terms", "/sign-in", "/sign-up", "/reset-password"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
