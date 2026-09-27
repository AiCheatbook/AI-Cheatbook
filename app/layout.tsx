import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import Navbar from "@/components/navbar/Navbar";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import MiniGenerator from "@/components/generator/MiniGenerator";
import { SITE_URL, SITE_NAME } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/lib/siteSettings";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/structuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "AI Cheatbook — Learn, Create & Grow with AI",
    template: "%s | AI Cheatbook",
  },
  description:
    "Join AI creator communities, discover powerful prompts and keywords, and learn AI concepts through practical guides, resources, and the latest AI news.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title:
      "AI Cheatbook — Learn, Create & Grow with AI",
    description:
      "Join AI creator communities, discover powerful prompts and keywords, and learn AI concepts through practical guides, resources, and the latest AI news.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AI Cheatbook — Learn, Create & Grow with AI",
    description:
      "Join AI creator communities, discover powerful prompts and keywords, and learn AI concepts through practical guides, resources, and the latest AI news.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Site settings (icon, logo, menu switches) are read when pages are
// rendered; pages refresh at least every 5 minutes, and saving at
// /admin/settings refreshes them straight away.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const icon = settings.faviconUrl || "/favicon.ico";

  return {
    ...baseMetadata,
    icons: {
      icon,
      shortcut: icon,
      apple: settings.faviconUrl || undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${
        siteSettings.homeTheme === "dark" ? "site-dark home-dark" : ""
      }`}
    >
      <body className="min-h-full bg-white font-sans">
        <JsonLd
          data={[
            buildOrganizationSchema(),
            buildWebSiteSchema(),
          ]}
        />

        <Navbar settings={siteSettings} />

        {children}

        <PageViewTracker />
        <GoogleAnalytics />
        <MiniGenerator />
      </body>
    </html>
  );
}