import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import { buildContentMetadata } from "@/lib/seo/metadata";
import DiscussionDetailClient from "@/components/discussions/DiscussionDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

/*
 * Real per-post SEO metadata — previously
 * this whole page was client-only, so every
 * community post shared identical generic
 * site metadata and had no real signal for
 * Google to index it as distinct content.
 * All the actual interactivity (voting,
 * replies, accept-answer) is unchanged,
 * just moved into DiscussionDetailClient.
 */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  const { data: thread } = await supabase
    .from("community_threads")
    .select("title, body")
    .eq("id", id)
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .maybeSingle();

  if (!thread) {
    return {
      title: "Discussion not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildContentMetadata(
    {
      title: thread.title,
      description: thread.body,
    },
    `/discussions/${id}`
  );
}

export default async function DiscussionThreadPage({
  params,
}: PageProps) {
  const { id } = await params;

  const { data: thread } = await supabase
    .from("community_threads")
    .select("id")
    .eq("id", id)
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .maybeSingle();

  if (!thread) {
    notFound();
  }

  return <DiscussionDetailClient />;
}
