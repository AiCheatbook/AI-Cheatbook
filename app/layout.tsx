import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import Navbar from "@/components/navbar/Navbar";
import CommunitySidebar from "@/components/community/layout/CommunitySidebar";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import MiniGenerator from "@/components/generator/MiniGenerator";
import { SITE_URL, SITE_NAME } from "@/lib/seo/metadata";
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

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white font-sans">
        <JsonLd
          data={[
            buildOrganizationSchema(),
            buildWebSiteSchema(),
          ]}
        />

        <Navbar />

        <div className="mx-auto flex max-w-[1600px]">
          <CommunitySidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>

        <PageViewTracker />
        <MiniGenerator />
      </body>
    </html>
  );
}