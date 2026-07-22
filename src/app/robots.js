const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sanddock.com").replace(/\/$/, "");

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/terminal",
        "/terminal/",
        "/billing",
        "/onboarding",
        "/apply",
        "/verify-email",
        "/admin",
        "/admin/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
