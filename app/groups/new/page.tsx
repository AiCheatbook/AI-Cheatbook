"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { generateUniqueGroupSlug } from "@/lib/groups/slug";

const CATEGORIES = [
  "General AI",
  "Prompt Engineering",
  "AI Video",
  "AI Image",
  "AI Coding",
  "AI Business",
  "AI News & Research",
];

export default function NewGroupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState<"public" | "invite_only">(
    "public"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be under 5MB.");
      return;
    }

    setError("");
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Give your community a name.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseAuthClient.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in to create a community.");
      }

      let coverImageUrl: string | null = null;

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          coverImageUrl = uploadData.url;
        } else {
          console.error(
            "Group cover upload failed:",
            uploadData.error
          );
          // Not fatal — the group can still be created without a cover.
        }
      }

      const slug = await generateUniqueGroupSlug(name.trim());

      const { data: inserted, error: insertError } = await supabaseAuthClient
        .from("groups")
        .insert({
          slug,
          name: name.trim(),
          description: description.trim() || null,
          category,
          visibility,
          cover_image_url: coverImageUrl,
          owner_id: user.id,
        })
        .select("id, slug")
        .single();

      if (insertError) {
        throw new Error(`Save failed: ${insertError.message}`);
      }

      if (!inserted?.slug) {
        throw new Error(
          "The community didn't save correctly — no confirmation was returned. Please try again."
        );
      }

      // The creator is automatically the group's first (owner) member.
      const { error: memberError } = await supabaseAuthClient
        .from("group_members")
        .insert({
          group_id: inserted.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });

      if (memberError) {
        console.error(
          "Failed to add creator as owner member:",
          memberError.message
        );
      }

      router.push(`/groups/${inserted.slug}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong creating your community."
      );
      console.error("Group creation failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Start Your AI Community</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create a space for people interested in a specific AI topic, tool,
          or your own content.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-900">
              Community name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midjourney Power Users"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-900">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's this community about?"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-900">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-900">
              Cover image (optional)
            </label>

            {coverPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt=""
                className="mb-2 h-32 w-full rounded-xl object-cover"
              />
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="w-full text-sm text-zinc-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-zinc-900">
              Who can join?
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  visibility === "public"
                    ? "border-brand bg-brand/10"
                    : "border-zinc-200"
                }`}
              >
                <span className="block font-semibold text-zinc-900">
                  🌐 Public
                </span>
                <span className="text-xs text-zinc-600">
                  Anyone can join instantly
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("invite_only")}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  visibility === "invite_only"
                    ? "border-brand bg-brand/10"
                    : "border-zinc-200"
                }`}
              >
                <span className="block font-semibold text-zinc-900">
                  🔒 Invite-only
                </span>
                <span className="text-xs text-zinc-600">
                  You approve join requests
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Community"}
          </button>
        </form>
      </div>
    </main>
  );
}
