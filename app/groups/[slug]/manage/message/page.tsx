"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const BATCH_SIZE = 500;

export default function GroupMessageMembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");

  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: groupRow, error: groupError } = await supabaseAuthClient
        .from("groups")
        .select("id, slug, name, owner_id")
        .eq("slug", slug)
        .maybeSingle();

      if (groupError) {
        console.error(
          "GroupMessageMembersPage: failed to load group:",
          groupError.message
        );
      }

      if (!groupRow || groupRow.owner_id !== user.id) {
        setForbidden(true);
        setChecking(false);
        return;
      }

      setGroupId(groupRow.id);
      setGroupName(groupRow.name);
      setLink(`/groups/${groupRow.slug}`);
      setChecking(false);
    }

    check();
  }, [slug, router]);

  async function handleSend() {
    if (!message.trim() || !groupId) return;

    const confirmed = confirm(
      `Send this message to every member of ${groupName}? This can't be undone.`
    );
    if (!confirmed) return;

    setSending(true);
    setError("");
    setResult("");
    setProgress({ done: 0, total: 0 });

    try {
      const { data: members, error: fetchError } = await supabaseAuthClient
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("status", "active");

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const ids = (members || []).map((m) => m.user_id);
      setProgress({ done: 0, total: ids.length });

      if (ids.length === 0) {
        setResult("No active members found — nothing sent.");
        setSending(false);
        return;
      }

      let sent = 0;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabaseAuthClient
          .from("notifications")
          .insert(
            batch.map((userId) => ({
              user_id: userId,
              actor_id: null,
              type: "community_message",
              message: `${groupName}: ${message.trim()}`,
              link: link.trim() || `/groups/${slug}`,
            }))
          );

        if (insertError) {
          throw new Error(insertError.message);
        }

        sent += batch.length;
        setProgress({ done: sent, total: ids.length });
      }

      setResult(`Sent to ${sent} member${sent === 1 ? "" : "s"}.`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
        <div className="mx-auto max-w-2xl animate-pulse text-sm text-zinc-400">
          Loading...
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Only this community&apos;s owner can message its members.
          </p>
          <Link href="/groups" className="mt-3 inline-block text-brand-text">
            ← Back to Communities
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/groups/${slug}/manage`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to {groupName} settings
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Message Members</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sends a notification to every active member of {groupName} — shows
          up in their notification bell, not an email.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What do you want to tell your members?"
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
              placeholder={`/groups/${slug}`}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
            />
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
