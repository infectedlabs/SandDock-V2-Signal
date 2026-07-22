import fs from "fs";
import path from "path";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sanddock.com").replace(/\/$/, "");

// Static, publicly-indexable marketing routes. Authenticated app routes
// (terminal, billing, onboarding, admin, etc.) are deliberately excluded -
// see robots.js, which disallows crawling them.
const STATIC_ROUTES = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/track-record", changeFrequency: "daily", priority: 0.9 },
  { path: "/learn", changeFrequency: "weekly", priority: 0.8 },
  { path: "/compare", changeFrequency: "weekly", priority: 0.8 },
  { path: "/alternatives", changeFrequency: "weekly", priority: 0.8 },
  { path: "/articles", changeFrequency: "weekly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", changeFrequency: "monthly", priority: 0.3 },
];

// Content collections rendered by app/{learn,compare,alternatives}/[slug]/page.js
const CONTENT_DIRS = [
  { dir: "learn", route: "/learn" },
  { dir: "compare", route: "/compare" },
  { dir: "alternatives", route: "/alternatives" },
];

function getContentEntries({ dir, route }) {
  const absoluteDir = path.join(process.cwd(), "content", dir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs
    .readdirSync(absoluteDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { mtime } = fs.statSync(path.join(absoluteDir, f));
      return {
        url: `${SITE_URL}${route}/${slug}`,
        lastModified: mtime,
        changeFrequency: "monthly",
        priority: 0.7,
      };
    });
}

export default function sitemap() {
  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const contentEntries = CONTENT_DIRS.flatMap(getContentEntries);

  return [...staticEntries, ...contentEntries];
}
