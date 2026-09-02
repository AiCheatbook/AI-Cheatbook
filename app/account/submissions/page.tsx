"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Submission = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  kind: "Prompt" | "Learning Card";
};

const STATUS_STYLES: Record<
  string,
  string
> = {
  pending:
    "bg-yellow-500/10 text-yellow-400",
  approved:
    "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

export default function MySubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/account/submissions"
        );
        return;
      }

      const [
        promptResponse,
        cardResponse,
      ] = await Promise.all([
        supabaseAuthClient
          .from("prompt_submissions")
          .select(
            "id, title, status, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
        supabaseAuthClient
          .from(
            "learning_card_submissions"
          )
          .select(
            "id, title, status, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const combined: Submission[] = [
        ...(promptResponse.data || []).map(
          (item) => ({
            ...item,
            kind: "Prompt" as const,
          })
        ),
        ...(cardResponse.data || []).map(
          (item) => ({
            ...item,
            kind:
              "Learning Card" as const,
          })
        ),
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

      setSubmissions(combined);
      setLoading(false);
    }

    loadSubmissions();
  }, [router]);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Account
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          My Submissions
        </h1>

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        )}

        {!loading &&
          submissions.length === 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-600">
                You haven&apos;t submitted
                anything yet.
              </p>

              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/submit/prompt"
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Submit a Prompt
                </Link>

                <Link
                  href="/submit/learning-card"
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Submit a Learning Card
                </Link>
              </div>
            </div>
          )}

        {!loading &&
          submissions.length > 0 && (
            <div className="mt-6 space-y-3">
              {submissions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {item.kind}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      STATUS_STYLES[
                        item.status
                      ] ||
                      "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
