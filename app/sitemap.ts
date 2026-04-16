import type { MetadataRoute } from "next";

const BASE_URL = "https://binkraft-tools.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: "2026-04-16",
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/commute`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/gaman`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/oshikatsu`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/meeting`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: "2026-04-16",
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/commute-lifetime`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/gaman-cost`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/oshikatsu-cost`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/meeting-cost`,
      lastModified: "2026-04-16",
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
