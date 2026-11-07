
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import "./globals.css";

import { AuthProvider } from "@/contexts/AuthContext";
import LayoutClient from "@/components/LayoutClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://edukrate.in";
const siteTitle = "Edukrate — Learn. Organize. Grow.";

const siteDescription =
  "Edukrate is a student learning platform to discover, upload and share study notes, PDFs, assignments, previous year questions and educational resources.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  applicationName: "Edukrate",

  title: {
    default: siteTitle,
    template: "%s | Edukrate",
  },

  description: siteDescription,

  keywords: [
    "Edukrate",
    "study notes",
    "free notes",
    "PDF notes",
    "PYQs",
    "assignments",
    "student resources",
    "revision notes",
    "notes sharing platform",
    "class notes",
  ],

  authors: [{ name: "Edukrate", url: siteUrl }],
  creator: "Edukrate",
  publisher: "Edukrate",

  icons: {
    icon: "/edukratelogo.png",
    shortcut: "/edukratelogo.png",
    apple: "/edukratelogo.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Edukrate",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edukrate — Learn. Organize. Grow.",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },

  alternates: {
    canonical: siteUrl,
  },

  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Edukrate",
    slogan: "Learn. Organize. Grow.",
    url: siteUrl,
    logo: `${siteUrl}/edukratelogowithname.png`,
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />

        <AuthProvider>
          <LayoutClient>{children}</LayoutClient>

          <Toaster
            richColors
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
              },
            }}
          />

          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
