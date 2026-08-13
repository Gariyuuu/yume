import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yume-gray.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/rooms", "/room", "/settings", "/update-password", "/invite", "/auth", "/spotify"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
