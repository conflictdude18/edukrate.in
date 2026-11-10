
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import Script from "next/script";

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

const siteTitle =
  "Edukrate – Study Notes & Learning Resources";

const siteDescription =
  "Edukrate is a learning platform for students to discover study notes, educational PDFs, assignments, previous year questions, video lessons and AI-powered study assistance. Learn smarter with Edukrate.";

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
    "free study notes",
    "educational resources",
    "study material",
    "PDF notes",
    "previous year questions",
    "PYQ",
    "class notes",
    "revision notes",
    "student learning platform",
    "educational videos",
    "AI study assistant",
    "Notique AI",
  ],

  authors: [
    {
      name: "Edukrate",
      url: siteUrl,
    },
  ],

  creator: "Edukrate",
  publisher: "Edukrate",

  category: "education",

  referrer: "origin-when-cross-origin",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: [
      {
        url: "/edukratelogo.png",
        type: "image/png",
      },
    ],
    shortcut: "/edukratelogo.png",
    apple: "/edukratelogo.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Edukrate",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edukrate - Learn. Organize. Grow.",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        alt: "Edukrate - Learn. Organize. Grow.",
      },
    ],
  },

  other: {
    "google-adsense-account": "ca-pub-9129121205041534",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Edukrate",
        alternateName: "Edukrate Learning Platform",
        url: `${siteUrl}/`,
        slogan: "Learn. Organize. Grow.",
        logo: {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          url: `${siteUrl}/edukratelogo.png`,
          contentUrl: `${siteUrl}/edukratelogo.png`,
          caption: "Edukrate Logo",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Edukrate",
        alternateName: [
          "Edukrate Learning Platform",
          "edukrate.in",
        ],
        url: `${siteUrl}/`,
        description: siteDescription,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        inLanguage: "en-IN",
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Edukrate",
        alternateName: "Edukrate Learning Platform",
        slogan: "Learn. Organize. Grow.",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/edukratelogo.png`,
        },
        sameAs: [
          "https://www.instagram.com/edukrate.in/",
          "https://www.youtube.com/@edukrate.in",
          "https://www.linkedin.com/company/edukrate.in/",
        ],
      },
    ],
  };

  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">

        {/* Google AdSense */}
        <Script
          id="google-adsense"
          async
          strategy="beforeInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9129121205041534"
          crossOrigin="anonymous"
        />

        {/* Google AdSense Ad Blocking Recovery */}
        <Script
          id="google-adblocking-recovery"
          strategy="afterInteractive"
          src="https://fundingchoicesmessages.google.com/i/pub-9129121205041534?ers=1"
          async
        />

        <Script
          id="google-fc-present"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function signalGooglefcPresent() {
                  if (!window.frames['googlefcPresent']) {
                    if (document.body) {
                      const iframe = document.createElement('iframe');
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      iframe.style.border = 'none';
                      iframe.style.display = 'none';
                      iframe.name = 'googlefcPresent';
                      document.body.appendChild(iframe);
                    } else {
                      setTimeout(signalGooglefcPresent, 0);
                    }
                  }
                }
                signalGooglefcPresent();
              })();
            `,
          }}
        />

        {/* Organization and Website structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(
              /</g,
              "\\u003c"
            ),
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
