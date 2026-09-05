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

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
};

export default function GroupCoursesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error("GroupCoursesPage: failed to load group:", groupError.message);
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

      // RLS already blocks non-members from seeing anything other
      // than published courses, so this query is safe to just run —
      // it'll come back empty for a non-member rather than erroring.
      const { data: coursesData, error: coursesError } = await supabaseAuthClient
        .from("courses")
        .select("id, title, description, cover_image_url")
        .eq("group_id", groupRow.id)
        .order("sort_order", { ascending: true });

      if (coursesError) {
        console.error(
          "GroupCoursesPage: failed to load courses:",
          coursesError.message
        );
      }

      setCourses(coursesData || []);
      setLoading(false);
    }

    load();
  }, [slug]);

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
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/groups/${slug}`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to {group.name}
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Courses</h1>

        {!isMember ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
            {userId
              ? "Join this community to access its courses."
              : "Log in and join this community to access its courses."}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
            No courses published yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/groups/${slug}/courses/${c.id}`}
                className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-brand/50 hover:shadow-md"
              >
                {c.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover_image_url}
                    alt=""
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-brand-light text-3xl">
                    📚
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-600">
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
