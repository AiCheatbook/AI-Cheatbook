"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  moduleCount: number;
  lessonCount: number;
};

export default function ManageCoursesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadCourses(gid: string) {
    setLoading(true);

    const { data: coursesData, error } = await supabaseAuthClient
      .from("courses")
      .select("id, title, description, is_published")
      .eq("group_id", gid)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("ManageCoursesPage: failed to load courses:", error.message);
      setLoading(false);
      return;
    }

    const rows = coursesData || [];

    const withCounts = await Promise.all(
      rows.map(async (c) => {
        const { data: modules } = await supabaseAuthClient
          .from("course_modules")
          .select("id")
          .eq("course_id", c.id);

        const moduleIds = (modules || []).map((m) => m.id);

        let lessonCount = 0;
        if (moduleIds.length > 0) {
          const { count } = await supabaseAuthClient
            .from("course_lessons")
            .select("id", { count: "exact", head: true })
            .in("module_id", moduleIds);
          lessonCount = count || 0;
        }

        return {
          ...c,
          moduleCount: moduleIds.length,
          lessonCount,
        };
      })
    );

    setCourses(withCounts);
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
      await loadCourses(group.id);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !groupId) return;

    setCreating(true);

    const { data, error } = await supabaseAuthClient
      .from("courses")
      .insert({
        group_id: groupId,
        title: newTitle.trim(),
      })
      .select("id")
      .single();

    setCreating(false);

    if (error) {
      console.error("ManageCoursesPage: failed to create course:", error.message);
      return;
    }

    setNewTitle("");
    router.push(`/groups/${slug}/manage/courses/${data.id}`);
  }

  async function togglePublish(course: CourseRow) {
    setBusyId(course.id);

    const { error } = await supabaseAuthClient
      .from("courses")
      .update({ is_published: !course.is_published })
      .eq("id", course.id);

    if (!error) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, is_published: !c.is_published } : c
        )
      );
    } else {
      console.error("ManageCoursesPage: failed to toggle publish:", error.message);
    }

    setBusyId(null);
  }

  async function deleteCourse(course: CourseRow) {
    if (!confirm(`Delete "${course.title}"? This removes all its modules and lessons too.`))
      return;

    setBusyId(course.id);

    const { error } = await supabaseAuthClient
      .from("courses")
      .delete()
      .eq("id", course.id);

    if (!error) {
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } else {
      console.error("ManageCoursesPage: failed to delete course:", error.message);
    }

    setBusyId(null);
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
            Only this community&apos;s owner can manage its courses.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/groups/${slug}/manage`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to Manage
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Courses</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Members only see published courses — build drafts here first.
        </p>

        <form onSubmit={createCourse} className="mt-6 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New course title..."
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50"
          >
            {creating ? "Creating..." : "+ Create"}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {loading && (
            <p className="text-sm text-zinc-500">Loading courses...</p>
          )}

          {!loading && courses.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
              No courses yet — create your first one above.
            </div>
          )}

          {!loading &&
            courses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/groups/${slug}/manage/courses/${c.id}`}
                    className="truncate text-sm font-semibold text-zinc-900 hover:text-brand-text"
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"} ·{" "}
                    {c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      c.is_published
                        ? "bg-green-500/10 text-green-600"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {c.is_published ? "Published" : "Draft"}
                  </span>

                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => togglePublish(c)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-brand/50 disabled:opacity-40"
                  >
                    {c.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => deleteCourse(c)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-400 hover:text-red-500 disabled:opacity-40"
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
