import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import Navbar from "@/components/navbar/Navbar";
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
      "AI Cheatbook — Verified AI Prompts That Actually Work",
    template: "%s | AI Cheatbook",
  },
  description:
    "Browse verified AI prompts, learning cards, and the latest AI news for ChatGPT, Gemini, Claude, Midjourney and more.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title:
      "AI Cheatbook — Verified AI Prompts That Actually Work",
    description:
      "Browse verified AI prompts, learning cards, and the latest AI news for ChatGPT, Gemini, Claude, Midjourney and more.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "AI Cheatbook — Verified AI Prompts That Actually Work",
    description:
      "Browse verified AI prompts, learning cards, and the latest AI news.",
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

        {children}

        <MiniGenerator />
      </body>
    </html>
  );
}