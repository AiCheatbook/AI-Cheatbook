"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Group = {
  id: string;
  name: string;
  owner_id: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  goingCount: number;
  myStatus: "going" | "maybe" | "not_going" | null;
};

const RSVP_OPTIONS: { value: "going" | "maybe" | "not_going"; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Can't Go" },
];

export default function GroupEventsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([]);
  const [pastEvents, setPastEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadEvents(groupId: string, uid: string | null) {
    const { data, error } = await supabaseAuthClient
      .from("community_events")
      .select("id, title, description, location, starts_at, ends_at")
      .eq("group_id", groupId)
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("GroupEventsPage: failed to load events:", error.message);
      return;
    }

    const rows = data || [];

    const withRsvp = await Promise.all(
      rows.map(async (e) => {
        const [countRes, myRsvpRes] = await Promise.all([
          supabaseAuthClient
            .from("community_event_rsvps")
            .select("id", { count: "exact", head: true })
            .eq("event_id", e.id)
            .eq("status", "going"),
          uid
            ? supabaseAuthClient
                .from("community_event_rsvps")
                .select("status")
                .eq("event_id", e.id)
                .eq("user_id", uid)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return {
          ...e,
          goingCount: countRes.count || 0,
          myStatus: (myRsvpRes.data?.status as EventRow["myStatus"]) || null,
        };
      })
    );

    splitByTime(withRsvp);
  }

  function splitByTime(rows: EventRow[]) {
    const now = Date.now();
    setUpcomingEvents(rows.filter((e) => new Date(e.starts_at).getTime() >= now));
    setPastEvents(rows.filter((e) => new Date(e.starts_at).getTime() < now));
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      setUserId(user?.id || null);

      const { data: groupRow, error: groupError } = await supabaseAuthClient
        .from("groups")
        .select("id, name, owner_id")
        .eq("slug", slug)
        .maybeSingle();

      if (groupError) {
        console.error("GroupEventsPage: failed to load group:", groupError.message);
      }

      if (!groupRow) {
        setLoading(false);
        return;
      }

      setGroup(groupRow);

      let memberActive = false;

      if (user) {
        if (user.id === groupRow.owner_id) {
          memberActive = true;
        } else {
          const { data: membership } = await supabaseAuthClient
            .from("group_members")
            .select("status")
            .eq("group_id", groupRow.id)
            .eq("user_id", user.id)
            .maybeSingle();

          memberActive = membership?.status === "active";
        }
      }

      setIsMember(memberActive);

      // RLS blocks non-members from seeing events at all — this
      // just comes back empty for them, not an error.
      await loadEvents(groupRow.id, user?.id || null);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function setRsvp(eventId: string, status: "going" | "maybe" | "not_going") {
    if (!userId) return;
    setBusyId(eventId);

    const { error } = await supabaseAuthClient
      .from("community_event_rsvps")
      .upsert(
        { event_id: eventId, user_id: userId, status },
        { onConflict: "event_id,user_id" }
      );

    if (!error && group) {
      await loadEvents(group.id, userId);
    } else if (error) {
      console.error("GroupEventsPage: failed to RSVP:", error.message);
    }

    setBusyId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  if (!group) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">Community not found</h1>
          <Link href="/groups" className="mt-2 inline-block text-brand-text">
            ← Back to all communities
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/groups/${slug}`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to {group.name}
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Events</h1>

        {!isMember ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
            {userId
              ? "Join this community to see and RSVP to its events."
              : "Log in and join this community to see and RSVP to its events."}
          </div>
        ) : (
          <>
            <h2 className="mt-6 text-sm font-semibold text-zinc-900">
              Upcoming ({upcomingEvents.length})
            </h2>

            <div className="mt-2 space-y-3">
              {upcomingEvents.length === 0 && (
                <p className="text-sm text-zinc-500">No upcoming events.</p>
              )}

              {upcomingEvents.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
                    {new Date(e.starts_at).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <h3 className="mt-1 font-semibold text-zinc-900">{e.title}</h3>
                  {e.location && (
                    <p className="mt-0.5 text-sm text-zinc-600">📍 {e.location}</p>
                  )}
                  {e.description && (
                    <p className="mt-1 text-sm text-zinc-600">{e.description}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">{e.goingCount} going</p>

                  {userId && (
                    <div className="mt-3 flex gap-1.5">
                      {RSVP_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={busyId === e.id}
                          onClick={() => setRsvp(e.id, opt.value)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                            e.myStatus === opt.value
                              ? "border-brand bg-brand/10 text-brand-text"
                              : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pastEvents.length > 0 && (
              <>
                <h2 className="mt-8 text-sm font-semibold text-zinc-500">
                  Past Events
                </h2>
                <div className="mt-2 space-y-2">
                  {pastEvents.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 opacity-70"
                    >
                      <p className="text-sm font-medium text-zinc-700">{e.title}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(e.starts_at).toLocaleDateString()} ·{" "}
                        {e.goingCount} attended
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
