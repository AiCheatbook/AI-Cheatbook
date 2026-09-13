"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Audience = "all" | "new";

const BATCH_SIZE = 500;

export default function AdminMessagesPage() {
  const [audience, setAudience] = useState<Audience>("all");
  const [newDays, setNewDays] = useState(7);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handleSend() {
    if (!message.trim()) return;

    const confirmed = confirm(
      audience === "all"
        ? "Send this message to every user on the site? This can't be undone."
        : `Send this message to everyone who joined in the last ${newDays} day(s)? This can't be undone.`
    );
    if (!confirmed) return;

    setSending(true);
    setError("");
    setResult("");
    setProgress({ done: 0, total: 0 });

    try {
      let query = supabase.from("profiles").select("id");

      if (audience === "new") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - newDays);
        query = query.gte("created_at", cutoff.toISOString());
      }

      const { data: recipients, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const ids = (recipients || []).map((r) => r.id);
      setProgress({ done: 0, total: ids.length });

      if (ids.length === 0) {
        setResult("No matching users found — nothing sent.");
        setSending(false);
        return;
      }

      let sent = 0;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(
            batch.map((userId) => ({
              user_id: userId,
              actor_id: null,
              type: "admin_broadcast",
              message: message.trim(),
              link: link.trim() || "/",
            }))
          );

        if (insertError) {
          throw new Error(insertError.message);
        }

        sent += batch.length;
        setProgress({ done: sent, total: ids.length });
      }

      setResult(`Sent to ${sent} user${sent === 1 ? "" : "s"}.`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Admin
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Message Users</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sends a notification straight to the bell icon everyone already
          checks — not an email.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Audience</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  checked={audience === "all"}
                  onChange={() => setAudience("all")}
                />
                All users
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  checked={audience === "new"}
                  onChange={() => setAudience("new")}
                />
                New members who joined in the last
              </label>
              {audience === "new" && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={newDays}
                    onChange={(e) =>
                      setNewDays(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-brand"
                  />
                  <span className="text-sm text-zinc-700">day(s)</span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What do you want to tell them?"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Link (optional)
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/prompts or https://..."
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Where clicking the notification takes them. Defaults to the
              homepage if left blank.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!message.trim() || sending}
            onClick={handleSend}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {sending
              ? `Sending... ${progress.done}/${progress.total}`
              : "Send Message"}
          </button>

          {result && <p className="text-sm text-zinc-600">{result}</p>}
        </div>
      </div>
    </main>
  );
}
