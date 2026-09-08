"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type FileStatus = {
  fileName: string;
  matchedTitle: string;
  status: "pending" | "uploading" | "done" | "no-match" | "error";
  error?: string;
};

/*
 * "001_Static_Shot.jpg" -> "Static Shot"
 * Strips extension, a leading numeric prefix (with any of _/-/space
 * as the separator), then turns remaining underscores into spaces.
 */
function extractTitleFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  const withoutPrefix = withoutExt.replace(/^\d+[\s_-]+/, "");
  return withoutPrefix.replace(/_/g, " ").trim();
}

export default function BulkImagesPage() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const fileObjectsRef = useRef<File[]>([]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);

    setFiles(
      selected.map((f) => ({
        fileName: f.name,
        matchedTitle: extractTitleFromFilename(f.name),
        status: "pending",
      }))
    );
    setFinished(false);
    fileObjectsRef.current = selected;
  }

  async function runImport() {
    setRunning(true);
    setFinished(false);

    const fileObjects = fileObjectsRef.current;

    for (let i = 0; i < fileObjects.length; i++) {
      const file = fileObjects[i];
      const matchedTitle = extractTitleFromFilename(file.name);

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f
        )
      );

      const { data: prompt } = await supabase
        .from("library_items")
        .select("id")
        .ilike("title", matchedTitle)
        .maybeSingle();

      if (!prompt) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "no-match" } : f
          )
        );
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Upload failed.");
        }

        const { error: updateError } = await supabase
          .from("library_items")
          .update({
            media_url: result.url,
            media_type: "image",
            media_source: "hostinger",
            media_aspect_ratio: "4:5",
          })
          .eq("id", prompt.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error: err instanceof Error ? err.message : "Failed",
                }
              : f
          )
        );
      }
    }

    setRunning(false);
    setFinished(true);
  }

  const doneCount = files.filter((f) => f.status === "done").length;
  const noMatchCount = files.filter((f) => f.status === "no-match").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Bulk Image Import</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Select every renamed image file at once. Each file is matched to
          a prompt by title — the numeric prefix (e.g. &quot;001_&quot;) and
          underscores are stripped automatically, so{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            001_Static_Shot.jpg
          </code>{" "}
          matches a prompt titled &quot;Static Shot&quot;. Matched images are
          uploaded to Hostinger and set as that prompt&apos;s Preview Media
          (4:5), exactly like uploading one manually on the prompt&apos;s own
          edit page.
        </p>

        <div className="mt-6">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 hover:border-brand/50">
            {files.length > 0
              ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
              : "Choose image files..."}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>
        </div>

        {files.length > 0 && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-600">
                {finished
                  ? `Done — ${doneCount} uploaded${
                      noMatchCount > 0 ? `, ${noMatchCount} no match` : ""
                    }${errorCount > 0 ? `, ${errorCount} failed` : ""}.`
                  : `${files.length} file${files.length === 1 ? "" : "s"} ready.`}
              </p>
              <button
                type="button"
                disabled={running}
                onClick={runImport}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              >
                {running
                  ? "Uploading..."
                  : finished
                    ? "Re-run"
                    : "Upload & Match All"}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Matches Prompt Title</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-600">
                        {f.fileName}
                      </td>
                      <td className="px-3 py-2">{f.matchedTitle}</td>
                      <td className="px-3 py-2">
                        {f.status === "pending" && (
                          <span className="text-zinc-400">Pending</span>
                        )}
                        {f.status === "uploading" && (
                          <span className="text-brand-text">Uploading...</span>
                        )}
                        {f.status === "done" && (
                          <span className="text-green-600">Uploaded</span>
                        )}
                        {f.status === "no-match" && (
                          <span
                            className="text-amber-600"
                            title="No prompt has this exact title"
                          >
                            No matching prompt
                          </span>
                        )}
                        {f.status === "error" && (
                          <span className="text-red-600" title={f.error}>
                            Failed: {f.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
