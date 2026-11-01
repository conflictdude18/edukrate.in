import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://edukrate.in",
      lastModified: new Date(),
    },
    {
      url: "https://edukrate.in/browse",
      lastModified: new Date(),
    },
    {
      url: "https://edukrate.in/signin",
      lastModified: new Date(),
    },
  ];
}