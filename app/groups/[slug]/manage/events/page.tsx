"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  goingCount: number;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ManageEventsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create/edit form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadEvents(gid: string) {
    setLoading(true);

    const { data, error } = await supabaseAuthClient
      .from("community_events")
      .select("id, title, description, location, starts_at, ends_at")
      .eq("group_id", gid)
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("ManageEventsPage: failed to load events:", error.message);
      setLoading(false);
      return;
    }

    const rows = data || [];

    const withCounts = await Promise.all(
      rows.map(async (e) => {
        const { count } = await supabaseAuthClient
          .from("community_event_rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", e.id)
          .eq("status", "going");
        return { ...e, goingCount: count || 0 };
      })
    );

    setEvents(withCounts);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: group } = await supabaseAuthClient
        .from("groups")
        .select("id, owner_id")
        .eq("slug", slug)
        .maybeSingle();

      if (!group || group.owner_id !== user.id) {
        setForbidden(true);
        setChecking(false);
        return;
      }

      setGroupId(group.id);
      setChecking(false);
      await loadEvents(group.id);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setEndsAt("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(event: EventRow) {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || "");
    setLocation(event.location || "");
    setStartsAt(toLocalInputValue(event.starts_at));
    setEndsAt(toLocalInputValue(event.ends_at));
    setShowForm(true);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt || !groupId) return;

    setSaving(true);

    const payload = {
      group_id: groupId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };

    const { error } = editingId
      ? await supabaseAuthClient
          .from("community_events")
          .update(payload)
          .eq("id", editingId)
      : await supabaseAuthClient.from("community_events").insert(payload);

    setSaving(false);

    if (!error) {
      resetForm();
      await loadEvents(groupId);
    } else {
      console.error("ManageEventsPage: failed to save event:", error.message);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;

    const { error } = await supabaseAuthClient
      .from("community_events")
      .delete()
      .eq("id", id);

    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      console.error("ManageEventsPage: failed to delete event:", error.message);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Only this community&apos;s owner can manage its events.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/groups/${slug}/manage`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to Manage
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Events</h1>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-brand-dark"
            >
              + New Event
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={saveEvent}
            className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. 'Online — Zoom link' or an address)"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Starts
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Ends (optional)
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!title.trim() || !startsAt || saving}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm text-zinc-500">Loading events...</p>}

          {!loading && events.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
              No events yet — create your first one above.
            </div>
          )}

          {!loading &&
            events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {e.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(e.starts_at).toLocaleString()} ·{" "}
                    {e.goingCount} going
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-brand/50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEvent(e.id)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-400 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
