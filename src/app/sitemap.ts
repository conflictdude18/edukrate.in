
import type { MetadataRoute } from "next";

const siteUrl = "https://edukrate.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = [
    {
      path: "",
      priority: 1.0,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/browse",
      priority: 0.9,
      changeFrequency: "daily" as const,
    },
    {
      path: "/videos",
      priority: 0.85,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/creators",
      priority: 0.75,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/trending",
      priority: 0.8,
      changeFrequency: "daily" as const,
    },
    {
      path: "/hall-of-fame",
      priority: 0.7,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/feedback",
      priority: 0.5,
      changeFrequency: "monthly" as const,
    },
    {
      path: "/premium",
      priority: 0.7,
      changeFrequency: "monthly" as const,
    },
    {
      path: "/notique",
      priority: 0.8,
      changeFrequency: "monthly" as const,
    },
    {
      path: "/ai-summary",
      priority: 0.7,
      changeFrequency: "monthly" as const,
    },
  ];

  return publicPages.map((page) => ({
    url: `${siteUrl}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
