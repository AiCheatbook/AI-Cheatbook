"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Course = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_published: boolean;
};

type ModuleWithLessons = {
  id: string;
  title: string;
  sort_order: number;
  lessons: LessonRow[];
};

type LessonRow = {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  sort_order: number;
};

export default function ManageCourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const courseId = params.courseId as string;

  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [savingLesson, setSavingLesson] = useState<string | null>(null);

  // Course settings form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);

  async function loadCourse() {
    setLoading(true);

    const { data: courseData, error: courseError } = await supabaseAuthClient
      .from("courses")
      .select("id, group_id, title, description, is_published")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) {
      console.error(
        "ManageCourseEditorPage: failed to load course:",
        courseError.message
      );
    }

    if (!courseData) {
      setLoading(false);
      return;
    }

    setCourse(courseData);
    setTitle(courseData.title);
    setDescription(courseData.description || "");

    const { data: moduleRows, error: moduleError } = await supabaseAuthClient
      .from("course_modules")
      .select("id, title, sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    if (moduleError) {
      console.error(
        "ManageCourseEditorPage: failed to load modules:",
        moduleError.message
      );
    }

    const moduleIds = (moduleRows || []).map((m) => m.id);

    const { data: lessonRows } =
      moduleIds.length > 0
        ? await supabaseAuthClient
            .from("course_lessons")
            .select("id, module_id, title, body, video_url, sort_order")
            .in("module_id", moduleIds)
            .order("sort_order", { ascending: true })
        : { data: [] };

    const withLessons = (moduleRows || []).map((m) => ({
      ...m,
      lessons: (lessonRows || []).filter(
        (l: { module_id: string }) => l.module_id === m.id
      ),
    }));

    setModules(withLessons);
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
        .select("owner_id")
        .eq("slug", slug)
        .maybeSingle();

      if (!group || group.owner_id !== user.id) {
        setForbidden(true);
        setChecking(false);
        return;
      }

      setChecking(false);
      await loadCourse();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, courseId]);

  async function saveCourseSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingCourse(true);

    const { error } = await supabaseAuthClient
      .from("courses")
      .update({
        title: title.trim(),
        description: description.trim() || null,
      })
      .eq("id", courseId);

    if (!error) {
      setCourse((c) =>
        c
          ? { ...c, title: title.trim(), description: description.trim() || null }
          : c
      );
    } else {
      console.error(
        "ManageCourseEditorPage: failed to save course settings:",
        error.message
      );
    }

    setSavingCourse(false);
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    const { data, error } = await supabaseAuthClient
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: newModuleTitle.trim(),
        sort_order: modules.length,
      })
      .select("id, title, sort_order")
      .single();

    if (!error && data) {
      setModules((prev) => [...prev, { ...data, lessons: [] }]);
      setNewModuleTitle("");
    } else if (error) {
      console.error("ManageCourseEditorPage: failed to add module:", error.message);
    }
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return;

    const { error } = await supabaseAuthClient
      .from("course_modules")
      .delete()
      .eq("id", moduleId);

    if (!error) {
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
    } else {
      console.error(
        "ManageCourseEditorPage: failed to delete module:",
        error.message
      );
    }
  }

  async function addLesson(moduleId: string) {
    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    const { data, error } = await supabaseAuthClient
      .from("course_lessons")
      .insert({
        module_id: moduleId,
        title: "New Lesson",
        sort_order: targetModule.lessons.length,
      })
      .select("id, title, body, video_url, sort_order")
      .single();

    if (!error && data) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, lessons: [...m.lessons, data] } : m
        )
      );
      setExpandedLesson(data.id);
    } else if (error) {
      console.error("ManageCourseEditorPage: failed to add lesson:", error.message);
    }
  }

  async function saveLesson(
    moduleId: string,
    lesson: LessonRow
  ) {
    setSavingLesson(lesson.id);

    const { error } = await supabaseAuthClient
      .from("course_lessons")
      .update({
        title: lesson.title.trim() || "Untitled Lesson",
        body: lesson.body,
        video_url: lesson.video_url,
      })
      .eq("id", lesson.id);

    if (error) {
      console.error("ManageCourseEditorPage: failed to save lesson:", error.message);
    }

    setSavingLesson(null);
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm("Delete this lesson?")) return;

    const { error } = await supabaseAuthClient
      .from("course_lessons")
      .delete()
      .eq("id", lessonId);

    if (!error) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        )
      );
    } else {
      console.error(
        "ManageCourseEditorPage: failed to delete lesson:",
        error.message
      );
    }
  }

  function updateLessonField(
    moduleId: string,
    lessonId: string,
    field: "title" | "body" | "video_url",
    value: string
  ) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, [field]: value } : l
              ),
            }
          : m
      )
    );
  }

  if (checking || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  if (forbidden || !course) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">
            {forbidden ? "Not authorized" : "Course not found"}
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/groups/${slug}/manage/courses`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to Courses
        </Link>

        <form onSubmit={saveCourseSettings} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-lg font-bold outline-none focus:border-brand"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Course description..."
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={savingCourse}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:border-brand/50 disabled:opacity-50"
          >
            {savingCourse ? "Saving..." : "Save Course Details"}
          </button>
        </form>

        <div className="mt-8 space-y-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900">
                  {module.title}
                </h3>
                <button
                  type="button"
                  onClick={() => deleteModule(module.id)}
                  className="text-xs text-zinc-500 hover:text-red-500"
                >
                  Delete Module
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={lesson.title}
                        onChange={(e) =>
                          updateLessonField(
                            module.id,
                            lesson.id,
                            "title",
                            e.target.value
                          )
                        }
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLesson(
                            expandedLesson === lesson.id ? null : lesson.id
                          )
                        }
                        className="shrink-0 text-xs text-zinc-500 hover:text-brand-text"
                      >
                        {expandedLesson === lesson.id ? "Collapse" : "Edit Content"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLesson(module.id, lesson.id)}
                        className="shrink-0 text-xs text-zinc-500 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>

                    {expandedLesson === lesson.id && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={lesson.body || ""}
                          onChange={(e) =>
                            updateLessonField(
                              module.id,
                              lesson.id,
                              "body",
                              e.target.value
                            )
                          }
                          rows={6}
                          placeholder="Lesson content..."
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                        <input
                          value={lesson.video_url || ""}
                          onChange={(e) =>
                            updateLessonField(
                              module.id,
                              lesson.id,
                              "video_url",
                              e.target.value
                            )
                          }
                          placeholder="Video URL (optional — YouTube link or /media/... upload)"
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          disabled={savingLesson === lesson.id}
                          onClick={() => saveLesson(module.id, lesson)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50"
                        >
                          {savingLesson === lesson.id ? "Saving..." : "Save Lesson"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addLesson(module.id)}
                  className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs text-zinc-500 hover:border-brand/50 hover:text-brand-text"
                >
                  + Add Lesson
                </button>
              </div>
            </div>
          ))}

          <form onSubmit={addModule} className="flex gap-2">
            <input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="New module title (e.g. 'Module 1: Basics')..."
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!newModuleTitle.trim()}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm text-zinc-600 hover:border-brand/50 disabled:opacity-50"
            >
              + Add Module
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          Lessons are shown in creation order — drag-to-reorder isn&apos;t
          built yet. Delete and re-add in the order you want as a workaround
          for now.
        </p>
      </div>
    </main>
  );
}
