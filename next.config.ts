import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Next.js's built-in server-side
     * image optimizer (the /_next/image
     * proxy) needs native dependencies
     * (sharp) that don't reliably work
     * on traditional hosting like
     * Hostinger — it's really built for
     * Vercel's infrastructure. Every
     * image was failing with a 400 from
     * that proxy. Serving images at
     * their original URLs directly
     * avoids that fragile layer
     * entirely — a real, safe fix, not
     * a workaround.
     */
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;