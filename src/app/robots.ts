import { MetadataRoute } from "next";

// The only robots.txt: a second one in public/ is ignored and only invites contradictions.
// Everything behind the login is blocked from crawling (it redirects to /login anyway); the
// public pages, /login and /register stay crawlable so Google can read their own robots meta tags.
// Prefixes without a trailing slash also cover the list pages themselves (/clients, /admin).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/clients",
          "/requests",
          "/billing",
          "/notifications",
          "/settings",
          "/api/",
          "/upload/",
        ],
      },
    ],
    sitemap: "https://www.practicenudge.com/sitemap.xml",
  };
}
