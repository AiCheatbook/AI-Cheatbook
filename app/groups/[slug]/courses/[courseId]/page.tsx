"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Course = {
  id: string;
  title: string;
  description: string | null;
};

type Lesson = {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  sort_order: number;
};

type Module = {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  const id = watchMatch?.[1] || shortMatch?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export default function CourseViewerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const courseId = params.courseId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      setUserId(user?.id || null);

      // RLS enforces membership for all three of these — a non-member
      // simply gets nothing back, not an error.
      const [courseRes, moduleRes] = await Promise.all([
        supabaseAuthClient
          .from("courses")
          .select("id, title, description")
          .eq("id", courseId)
          .maybeSingle(),
        supabaseAuthClient
          .from("course_modules")
          .select("id, title, sort_order")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true }),
      ]);

      if (courseRes.error) {
        console.error(
          "CourseViewerPage: failed to load course:",
          courseRes.error.message
        );
      }

      if (!courseRes.data) {
        setLoading(false);
        return;
      }

      setCourse(courseRes.data);

      const moduleRows = moduleRes.data || [];
      const moduleIds = moduleRows.map((m) => m.id);

      const { data: lessonRows } =
        moduleIds.length > 0
          ? await supabaseAuthClient
              .from("course_lessons")
              .select("id, module_id, title, body, video_url, sort_order")
              .in("module_id", moduleIds)
              .order("sort_order", { ascending: true })
          : { data: [] };

      const withLessons = moduleRows.map((m) => ({
        ...m,
        lessons: (lessonRows || []).filter(
          (l: { module_id: string }) => l.module_id === m.id
        ),
      }));

      setModules(withLessons);

      const firstLesson = withLessons[0]?.lessons[0];
      if (firstLesson) setActiveLessonId(firstLesson.id);

      if (user) {
        const allLessonIds = withLessons.flatMap((m) =>
          m.lessons.map((l) => l.id)
        );

        if (allLessonIds.length > 0) {
          const { data: progress } = await supabaseAuthClient
            .from("course_lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .in("lesson_id", allLessonIds);

          setCompletedIds(new Set((progress || []).map((p) => p.lesson_id)));
        }
      }

      setLoading(false);
    }

    load();
  }, [courseId]);

  const allLessons = modules.flatMap((m) => m.lessons);
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || null;
  const isCompleted = activeLessonId ? completedIds.has(activeLessonId) : false;

  async function toggleComplete() {
    if (!userId || !activeLessonId) return;
    setMarking(true);

    if (isCompleted) {
      const { error } = await supabaseAuthClient
        .from("course_lesson_progress")
        .delete()
        .eq("lesson_id", activeLessonId)
        .eq("user_id", userId);

      if (!error) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(activeLessonId);
          return next;
        });
      }
    } else {
      const { error } = await supabaseAuthClient
        .from("course_lesson_progress")
        .insert({ lesson_id: activeLessonId, user_id: userId });

      if (!error) {
        setCompletedIds((prev) => new Set(prev).add(activeLessonId));
      }
    }

    setMarking(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">
            Course not found, or you don&apos;t have access yet
          </h1>
          <Link
            href={`/groups/${slug}/courses`}
            className="mt-2 inline-block text-brand-text"
          >
            ← Back to Courses
          </Link>
        </div>
      </main>
    );
  }

  const progressPercent =
    allLessons.length > 0
      ? Math.round((completedIds.size / allLessons.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto flex max-w-5xl gap-6 px-4 py-8 sm:px-6">
        <aside className="w-64 shrink-0">
          <Link
            href={`/groups/${slug}/courses`}
            className="text-sm text-zinc-500 hover:text-brand-text"
          >
            ← Back to Courses
          </Link>

          <h1 className="mt-2 text-lg font-bold">{course.title}</h1>

          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full rounded-full bg-brand"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {completedIds.size}/{allLessons.length} lessons complete
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {modules.map((m) => (
              <div key={m.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {m.title}
                </p>
                <div className="mt-1 space-y-0.5">
                  {m.lessons.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setActiveLessonId(l.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        activeLessonId === l.id
                          ? "bg-brand/10 text-brand-text"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="shrink-0">
                        {completedIds.has(l.id) ? "✅" : "⬜"}
                      </span>
                      <span className="truncate">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {activeLesson ? (
            <>
              <h2 className="text-xl font-bold">{activeLesson.title}</h2>

              {activeLesson.video_url && (
                <div className="mt-4">
                  {youtubeEmbedUrl(activeLesson.video_url) ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-zinc-100">
                      <iframe
                        src={youtubeEmbedUrl(activeLesson.video_url)!}
                        title={activeLesson.title}
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <video
                      src={activeLesson.video_url}
                      controls
                      className="max-h-96 w-full rounded-xl bg-zinc-100"
                    />
                  )}
                </div>
              )}

              {activeLesson.body && (
                <p className="mt-4 whitespace-pre-wrap text-zinc-700">
                  {activeLesson.body}
                </p>
              )}

              {userId && (
                <button
                  type="button"
                  disabled={marking}
                  onClick={toggleComplete}
                  className={`mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                    isCompleted
                      ? "border border-zinc-300 text-zinc-600 hover:border-red-400 hover:text-red-500"
                      : "bg-brand text-zinc-900 hover:bg-brand-dark"
                  }`}
                >
                  {isCompleted ? "✓ Completed — click to undo" : "Mark as Complete"}
                </button>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
              This course doesn&apos;t have any lessons yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
