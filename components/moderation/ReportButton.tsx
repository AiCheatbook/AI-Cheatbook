"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ReportContentType =
  | "community_thread"
  | "community_reply"
  | "community_poll";

type ReportButtonProps = {
  contentType: ReportContentType;
  contentId: string;
};

const REASONS: {
  value: string;
  label: string;
}[] = [
  { value: "spam", label: "Spam" },
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "misleading",
    label: "Misleading",
  },
  {
    value: "copyright",
    label: "Copyright",
  },
  { value: "nsfw", label: "NSFW" },
  {
    value: "hate_abuse",
    label: "Hate / Abuse",
  },
  { value: "other", label: "Other" },
];

export default function ReportButton({
  contentType,
  contentId,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] =
    useState("spam");
  const [details, setDetails] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [submitted, setSubmitted] =
    useState(false);

  async function handleSubmit() {
    setSubmitting(true);

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      window.location.href =
        "/login?redirect=" +
        window.location.pathname;
      return;
    }

    const { error } = await supabaseAuthClient
      .from("content_reports")
      .insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason,
        details: details.trim() || null,
      });

    setSubmitting(false);

    if (!error) {
      setSubmitted(true);
      window.setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setDetails("");
      }, 1500);
    }
  }

  return (
    <div
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="text-xs text-zinc-600 hover:text-red-400"
      >
        Report
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-30 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl">
          {submitted ? (
            <p className="text-xs text-green-400">
              Report submitted. Thank
              you.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-zinc-300">
                Why are you reporting
                this?
              </p>

              <select
                value={reason}
                onChange={(e) =>
                  setReason(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-xs text-white outline-none"
              >
                {REASONS.map((r) => (
                  <option
                    key={r.value}
                    value={r.value}
                  >
                    {r.label}
                  </option>
                ))}
              </select>

              <textarea
                value={details}
                onChange={(e) =>
                  setDetails(
                    e.target.value
                  )
                }
                rows={2}
                placeholder="Additional details (optional)"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-xs text-white outline-none"
              />

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-red-500/90 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Report"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="rounded-lg border border-zinc-700 px-3 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
