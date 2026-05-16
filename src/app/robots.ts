import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/upload/"],
      },
    ],
    sitemap: "https://www.practicenudge.com/sitemap.xml",
  };
}
