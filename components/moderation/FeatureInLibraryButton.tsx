"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type FeatureInLibraryButtonProps = {
  threadId: string;
  title: string;
  promptText: string;
  aiTool: string | null;
  authorName: string;
  alreadyFeatured: boolean;
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function FeatureInLibraryButton({
  threadId,
  title,
  promptText,
  aiTool,
  authorName,
  alreadyFeatured,
}: FeatureInLibraryButtonProps) {
  const [isAdmin, setIsAdmin] =
    useState(false);
  const [checking, setChecking] =
    useState(true);
  const [featured, setFeatured] = useState(
    alreadyFeatured
  );
  const [saving, setSaving] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setChecking(false);
        return;
      }

      const { data: profile } =
        await supabaseAuthClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      setIsAdmin(
        profile?.role === "admin"
      );
      setChecking(false);
    }

    checkAdmin();
  }, []);

  async function handleFeature() {
    const confirmed = window.confirm(
      `Feature "${title}" in the Prompt Library? This publishes it publicly.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: insertError } =
        await supabaseAuthClient
          .from("library_items")
          .insert({
            id: crypto.randomUUID(),
            title,
            slug: generateSlug(title),
            type: "prompt",
            category: "text",
            description: `Shared by the community${authorName ? ` — originally posted by ${authorName}` : ""}.`,
            prompt: promptText,
            ai_tools: aiTool
              ? [aiTool]
              : [],
            author_name: authorName,
            is_published: true,
            is_featured: false,
            is_trending: false,
            published_at:
              new Date().toISOString(),
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const { error: updateError } =
        await supabaseAuthClient
          .from("community_threads")
          .update({
            featured_in_library: true,
          })
          .eq("id", threadId);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setFeatured(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to feature this prompt."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking || !isAdmin) {
    return null;
  }

  if (featured) {
    return (
      <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400">
        ✓ Featured in Library
      </span>
    );
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFeature();
        }}
        disabled={saving}
        className="rounded-full border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-400 transition hover:bg-purple-500/10 disabled:opacity-50"
      >
        {saving
          ? "Featuring..."
          : "⭐ Feature in Library"}
      </button>

      {error && (
        <p className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
