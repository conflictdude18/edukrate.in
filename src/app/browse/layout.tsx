
import type { Metadata } from "next";

const siteUrl = "https://edukrate.in";

export const metadata: Metadata = {
  title: "Browse Study Notes, PDFs & Resources | Edukrate",
  description:
    "Explore study notes, revision materials, PDFs, assignments and educational resources shared by students. Find learning materials by class, subject, board and topic on Edukrate.",

  alternates: {
    canonical: `${siteUrl}/browse`,
  },

  keywords: [
    "browse study notes",
    "free study notes",
    "class 12 notes",
    "class 11 notes",
    "CBSE study material",
    "study PDFs",
    "revision notes",
    "student learning resources",
    "Edukrate notes library",
  ],

  openGraph: {
    title: "Browse Study Notes & Learning Resources | Edukrate",
    description:
      "Discover community-shared notes, PDFs, assignments and revision resources for your studies.",
    url: `${siteUrl}/browse`,
    siteName: "Edukrate",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edukrate — Study Notes and Learning Resources",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Browse Study Notes | Edukrate",
    description:
      "Discover study notes, PDFs and learning resources on Edukrate.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function BrowseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
    