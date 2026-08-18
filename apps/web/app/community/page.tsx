"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";

type CommunityPrompt = {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
  ai_tool: string | null;
  category: string | null;
  author_name: string;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
};

const AI_TOOLS = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

export default function CommunityPage() {
  const [prompts, setPrompts] = useState<CommunityPrompt[]>(
    []
  );

  const [search, setSearch] = useState("");

  const [selectedTool, setSelectedTool] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCommunityPrompts() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("community_prompts")
          .select(
            `
              id,
              title,
              description,
              prompt,
              ai_tool,
              category,
              author_name,
              is_verified,
              is_featured,
              created_at
            `
          )
          .order("is_featured", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw new Error(error.message);
        }

        setPrompts(
          (data || []) as CommunityPrompt[]
        );
      } catch (err) {
        console.error(
          "Failed to load community prompts:",
          err
        );

        setError(
          "Unable to load community prompts."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCommunityPrompts();
  }, []);

  const filteredPrompts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return prompts.filter((prompt) => {
      const searchableText = [
        prompt.title,
        prompt.description,
        prompt.prompt,
        prompt.ai_tool,
        prompt.category,
        prompt.author_name,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      const matchesTool =
        !selectedTool ||
        prompt.ai_tool === selectedTool;

      return (
        matchesSearch &&
        matchesTool
      );
    });
  }, [
    prompts,
    search,
    selectedTool,
  ]);

  return (
    <main className="min-h-screen bg-black">

      {/* Hero */}

      <section className="border-b border-zinc-900 bg-black px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
            Community
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            AI Creator Community
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            Discover prompts shared by creators,
            explore useful AI workflows and learn
            what actually works.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

            <a
              href="#community-prompts"
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Explore Prompts
            </a>

            <Link
              href="/generator"
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
            >
              Create a Prompt
            </Link>

          </div>

        </div>
      </section>

      {/* Community */}

      <section
        id="community-prompts"
        className="bg-zinc-950 px-6 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">

          {/* Header */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
                Community Library
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Community Prompts
              </h2>

              <p className="mt-3 max-w-2xl text-zinc-400">
                Explore prompts shared by the AI
                Cheatbook community.
              </p>
            </div>

            <div className="text-sm text-zinc-500">
              {filteredPrompts.length}{" "}
              {filteredPrompts.length === 1
                ? "prompt"
                : "prompts"}
            </div>

          </div>

          {/* Search */}

          <div className="mb-6">
            <div className="relative">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search community prompts..."
                aria-label="Search community prompts"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 pl-12 text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-500"
              />

              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500">
                🔍
              </span>

            </div>
          </div>

          {/* AI Tool Filters */}

          <div className="mb-10 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setSelectedTool("")
              }
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                !selectedTool
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              All
            </button>

            {AI_TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() =>
                  setSelectedTool(tool)
                }
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedTool === tool
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {tool}
              </button>
            ))}

          </div>

          {/* Loading */}

          {loading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
                />
              ))}

            </div>
          )}

          {/* Error */}

          {!loading && error && (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-10 text-center">

              <p className="text-red-400">
                {error}
              </p>

            </div>
          )}

          {/* Prompts */}

          {!loading &&
            !error &&
            filteredPrompts.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {filteredPrompts.map(
                  (prompt) => (
                    <CommunityPromptCard
                      key={prompt.id}
                      prompt={prompt}
                    />
                  )
                )}

              </div>
            )}

          {/* Empty */}

          {!loading &&
            !error &&
            filteredPrompts.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">

                <div className="text-5xl">
                  🔍
                </div>

                <h3 className="mt-5 text-2xl font-semibold text-white">
                  No prompts found
                </h3>

                <p className="mx-auto mt-3 max-w-md text-zinc-400">
                  Try another search term or
                  select a different AI tool.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedTool("");
                  }}
                  className="mt-6 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
                >
                  Clear Filters
                </button>

              </div>
            )}

        </div>
      </section>

      {/* CTA */}

      <section className="border-t border-zinc-900 bg-black px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-12 text-center sm:px-12">

          <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
            Share Your Work
          </p>

          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Have a prompt that actually works?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Share your workflow with the community
            and help other creators get better results
            from AI.
          </p>

          <Link
            href="/generator"
            className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Create Your Prompt
          </Link>

        </div>
      </section>

    </main>
  );
}


/* --------------------------------
   Community Prompt Card
--------------------------------- */

function CommunityPromptCard({
  prompt,
}: {
  prompt: CommunityPrompt;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-orange-500">

      {/* Card Header */}

      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">

        <div className="flex flex-wrap gap-2">

          {prompt.ai_tool && (
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
              {prompt.ai_tool}
            </span>
          )}

          {prompt.category && (
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
              {prompt.category}
            </span>
          )}

        </div>

        {prompt.is_verified && (
          <span
            className="text-xs text-green-400"
            title="Community verified"
          >
            ✓
          </span>
        )}

      </div>

      {/* Content */}

      <div className="flex flex-1 flex-col p-5">

        <h3 className="text-xl font-semibold text-white transition group-hover:text-orange-400">
          {prompt.title}
        </h3>

        {prompt.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
            {prompt.description}
          </p>
        )}

        {/* Prompt Preview */}

        <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">

          <p className="line-clamp-4 whitespace-pre-line text-sm leading-6 text-zinc-400">
            {prompt.prompt}
          </p>

        </div>

        {/* Author */}

        <div className="mt-auto pt-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs text-zinc-600">
                Created by
              </p>

              <p className="mt-1 text-sm font-medium text-zinc-300">
                {prompt.author_name}
              </p>
            </div>

            {prompt.is_featured && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-400">
                Featured
              </span>
            )}

          </div>

          {/* Actions */}

          <div className="mt-5">

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  prompt.prompt
                )
              }
              className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
            >
              Copy Prompt
            </button>

          </div>

        </div>

      </div>

    </article>
  );
}