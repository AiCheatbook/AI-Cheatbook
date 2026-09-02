import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import { buildContentMetadata } from "@/lib/seo/metadata";
import PollDetailClient from "@/components/discussions/PollDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

/*
 * Same fix as the discussion detail page —
 * this was entirely client-side with zero
 * generateMetadata capability. Note: polls
 * only have is_hidden, NOT deleted_at (that
 * column only exists on community_threads),
 * so this intentionally does not reference
 * deleted_at.
 */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  const { data: poll } = await supabase
    .from("community_polls")
    .select("question, description")
    .eq("id", id)
    .eq("is_hidden", false)
    .maybeSingle();

  if (!poll) {
    return {
      title: "Poll not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildContentMetadata(
    {
      title: poll.question,
      description: poll.description,
    },
    `/community/polls/${id}`
  );
}

export default async function PollDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const { data: poll, error } =
    await supabase
      .from("community_polls")
      .select("id")
      .eq("id", id)
      .eq("is_hidden", false)
      .maybeSingle();

  if (!poll && !error) {
    notFound();
  }

  if (error) {
    console.error(
      "Poll existence check failed:",
      error.message
    );
  }

  return <PollDetailClient />;
}
