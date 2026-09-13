"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Audience = "all" | "new" | "individual" | "community_owner";

type UserResult = { id: string; display_name: string | null; email: string | null };
type GroupResult = { id: string; name: string; owner_id: string; slug: string };

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

  // Individual member picker
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Community owner picker
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<GroupResult[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupResult | null>(null);
  const [searchingGroups, setSearchingGroups] = useState(false);

  async function searchUsers(query: string) {
    setUserQuery(query);
    setSelectedUser(null);

    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    setSearchingUsers(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8);

    setUserResults((data || []) as UserResult[]);
    setSearchingUsers(false);
  }

  async function searchGroups(query: string) {
    setGroupQuery(query);
    setSelectedGroup(null);

    if (!query.trim()) {
      setGroupResults([]);
      return;
    }

    setSearchingGroups(true);
    const { data } = await supabase
      .from("groups")
      .select("id, name, owner_id, slug")
      .ilike("name", `%${query}%`)
      .limit(8);

    setGroupResults((data || []) as GroupResult[]);
    setSearchingGroups(false);
  }

  async function handleSend() {
    if (!message.trim()) return;
    if (audience === "individual" && !selectedUser) return;
    if (audience === "community_owner" && !selectedGroup) return;

    const confirmLabel =
      audience === "all"
        ? "Send this message to every user on the site? This can't be undone."
        : audience === "new"
          ? `Send this message to everyone who joined in the last ${newDays} day(s)? This can't be undone.`
          : audience === "individual"
            ? `Send this message to ${selectedUser?.display_name || selectedUser?.email}?`
            : `Send this message to ${selectedGroup?.name}'s owner?`;

    const confirmed = confirm(confirmLabel);
    if (!confirmed) return;

    setSending(true);
    setError("");
    setResult("");
    setProgress({ done: 0, total: 0 });

    try {
      let ids: string[] = [];

      if (audience === "individual") {
        ids = selectedUser ? [selectedUser.id] : [];
      } else if (audience === "community_owner") {
        ids = selectedGroup ? [selectedGroup.owner_id] : [];
      } else {
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

        ids = (recipients || []).map((r) => r.id);
      }

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

  const canSend =
    message.trim() &&
    (audience === "all" ||
      audience === "new" ||
      (audience === "individual" && selectedUser) ||
      (audience === "community_owner" && selectedGroup));

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
            <div className="mt-2 space-y-3">
              <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  checked={audience === "all"}
                  onChange={() => setAudience("all")}
                />
                All users
              </label>

              <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  checked={audience === "new"}
                  onChange={() => setAudience("new")}
                />
                New members who joined in the last
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
                    <span>day(s)</span>
                  </>
                )}
              </label>

              <div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    checked={audience === "individual"}
                    onChange={() => setAudience("individual")}
                  />
                  A specific individual member
                </label>

                {audience === "individual" && (
                  <div className="mt-2 ml-6">
                    <input
                      value={userQuery}
                      onChange={(e) => searchUsers(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full max-w-sm rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
                    />

                    {selectedUser ? (
                      <p className="mt-1.5 text-xs text-zinc-600">
                        Selected:{" "}
                        <span className="font-medium text-zinc-900">
                          {selectedUser.display_name || selectedUser.email}
                        </span>{" "}
                        <button
                          type="button"
                          onClick={() => setSelectedUser(null)}
                          className="text-red-500 hover:underline"
                        >
                          change
                        </button>
                      </p>
                    ) : (
                      <>
                        {searchingUsers && (
                          <p className="mt-1.5 text-xs text-zinc-400">
                            Searching...
                          </p>
                        )}
                        {userResults.length > 0 && (
                          <div className="mt-1.5 max-w-sm overflow-hidden rounded-lg border border-zinc-200">
                            {userResults.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setUserResults([]);
                                }}
                                className="block w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                              >
                                {u.display_name || "Unnamed"}{" "}
                                <span className="text-zinc-400">
                                  {u.email}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    checked={audience === "community_owner"}
                    onChange={() => setAudience("community_owner")}
                  />
                  The owner of a specific community
                </label>

                {audience === "community_owner" && (
                  <div className="mt-2 ml-6">
                    <input
                      value={groupQuery}
                      onChange={(e) => searchGroups(e.target.value)}
                      placeholder="Search communities by name..."
                      className="w-full max-w-sm rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
                    />

                    {selectedGroup ? (
                      <p className="mt-1.5 text-xs text-zinc-600">
                        Selected:{" "}
                        <span className="font-medium text-zinc-900">
                          {selectedGroup.name}
                        </span>{" "}
                        <button
                          type="button"
                          onClick={() => setSelectedGroup(null)}
                          className="text-red-500 hover:underline"
                        >
                          change
                        </button>
                      </p>
                    ) : (
                      <>
                        {searchingGroups && (
                          <p className="mt-1.5 text-xs text-zinc-400">
                            Searching...
                          </p>
                        )}
                        {groupResults.length > 0 && (
                          <div className="mt-1.5 max-w-sm overflow-hidden rounded-lg border border-zinc-200">
                            {groupResults.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGroup(g);
                                  setGroupResults([]);
                                }}
                                className="block w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
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
            disabled={!canSend || sending}
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
