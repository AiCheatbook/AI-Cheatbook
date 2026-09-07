"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ArtworkTile = {
  id: string;
  title: string;
  imageUrl: string;
};

const FEATURES = [
  {
    icon: "✨",
    title: "Prompt Library",
    copy: "Discover verified AI prompts that actually work.",
  },
  {
    icon: "🧭",
    title: "AI Tools & Workflows",
    copy: "Learn practical workflows for AI creation.",
  },
  {
    icon: "💬",
    title: "Community",
    copy: "Share ideas, variations and creative experiments.",
  },
  {
    icon: "📰",
    title: "AI News & Learning",
    copy: "Stay updated with important developments in AI.",
  },
];

// Varying spans give the wall an editorial, collage feel rather
// than a flat uniform grid — repeats if there are more tiles
// than patterns defined here.
const TILE_SPANS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-2",
];

export default function FirstVisitIntro({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<ArtworkTile[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("community_artwork")
        .select(
          "id, title, media_assets ( storage_path, media_type )"
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      const tiles: ArtworkTile[] = (data || [])
        .map((row) => {
          const asset = Array.isArray(row.media_assets)
            ? row.media_assets[0]
            : row.media_assets;

          if (!asset || asset.media_type === "youtube" || !asset.storage_path) {
            return null;
          }

          return {
            id: row.id,
            title: row.title,
            imageUrl: asset.storage_path,
          };
        })
        .filter((t): t is ArtworkTile => t !== null);

      setArtwork(tiles);
    }

    load();
  }, []);

  function dismissAndGo(path?: string) {
    sessionStorage.setItem("introSeen", "1");
    onDismiss();
    if (path) router.push(path);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950">
      {/* Artwork wall background */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 opacity-40 sm:grid-cols-6">
        {artwork.map((tile, i) => (
          <div
            key={tile.id}
            className={`relative overflow-hidden bg-neutral-900 ${
              TILE_SPANS[i % TILE_SPANS.length]
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dark gradient for text legibility over the wall */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/85 to-neutral-950" />

      {/* Content */}
      <div className="relative flex min-h-full flex-col items-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          AI Cheatbook
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
          Community for AI Content Creators
        </h1>

        <p className="mt-5 max-w-xl text-base text-neutral-300 sm:text-lg">
          Discover prompts, workflows, techniques, inspiration and
          ideas to create better with AI.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => dismissAndGo("/login?mode=signup")}
            className="w-64 rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-brand-dark sm:w-auto"
          >
            Join the Community
          </button>

          <button
            type="button"
            onClick={() => dismissAndGo()}
            className="w-64 rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            Explore the Community
          </button>
        </div>

        <button
          type="button"
          onClick={() => dismissAndGo()}
          className="mt-5 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          Skip for now
        </button>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-left sm:text-center">
              <span className="text-2xl">{f.icon}</span>
              <p className="mt-2 text-sm font-semibold text-white">
                {f.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                {f.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
