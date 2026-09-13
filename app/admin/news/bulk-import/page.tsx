"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

const COLUMNS = [
  "Title",
  "Excerpt",
  "Category",
  "Author",
  "Content",
  "Cover Image URL",
];

const EXAMPLE_ROW = [
  "Google Releases Veo 3.1",
  "A short summary of what changed and why it matters.",
  "Video AI",
  "AI Cheatbook Team",
  "Full article text goes here. Each paragraph on its own line becomes its own paragraph.",
  "https://example.com/cover.jpg",
];

type ParsedRow = {
  rowNumber: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  content: string;
  coverImageUrl: string;
  status: "pending" | "importing" | "done" | "error";
  error?: string;
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

/*
 * Turns plain-text content (one paragraph per line, as typed in
 * an Excel cell) into simple HTML paragraphs — matching what the
 * news editor's content_html field expects, without needing a
 * full rich-text authoring step for a bulk import.
 */
function toContentHtml(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("\n");
}

export default function BulkImportNewsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([COLUMNS, EXAMPLE_ROW]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "News");
    XLSX.writeFile(workbook, "news-import-template.xlsx");
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setDone(false);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const parsed: ParsedRow[] = data.map((row, i) => ({
        rowNumber: i + 2,
        title: cell(row, "Title"),
        excerpt: cell(row, "Excerpt"),
        category: cell(row, "Category"),
        author: cell(row, "Author"),
        content: cell(row, "Content"),
        coverImageUrl: cell(row, "Cover Image URL"),
        status: "pending",
      }));

      setRows(parsed);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Couldn't read that file."
      );
    }
  }

  async function ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const { data } = await supabase
        .from("news")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      if (!data) return candidate;
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async function handleImport() {
    setImporting(true);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.title) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", error: "Missing title" }
              : r
          )
        );
        continue;
      }

      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "importing" } : r))
      );

      try {
        const slug = await ensureUniqueSlug(generateSlug(row.title));

        // Imported articles are NEVER auto-published, regardless
        // of what's in the spreadsheet — they always need an
        // explicit manual publish. Scheduling a publish time is
        // handled from the News list/editor instead, not here.
        const { error: insertError } = await supabase.from("news").insert({
          title: row.title,
          slug,
          excerpt: row.excerpt || null,
          category: row.category || null,
          author: row.author || null,
          cover_image_url: row.coverImageUrl || null,
          content_html: toContentHtml(row.content),
          is_published: false,
          published_at: null,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r))
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error",
                  error: err instanceof Error ? err.message : "Failed to import",
                }
              : r
          )
        );
      }
    }

    setImporting(false);
    setDone(true);
  }

  const successCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/news"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to News
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Bulk Import News</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Upload an Excel file to create many articles at once. Every
          imported article is saved as a draft — none are published
          automatically. Publish each one manually, or set a schedule for
          it, from the News list once it&apos;s imported.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand/50"
          >
            Download Template
          </button>

          <label className="cursor-pointer rounded-xl border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:border-brand/50">
            {fileName || "Choose Excel file..."}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>
        </div>

        {parseError && (
          <p className="mt-3 text-sm text-red-600">{parseError}</p>
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-zinc-600">
                {done
                  ? `Done — ${successCount} imported${
                      errorCount > 0 ? `, ${errorCount} failed` : ""
                    }.`
                  : `${rows.length} row${rows.length === 1 ? "" : "s"} ready.`}
              </p>
              <button
                type="button"
                disabled={importing}
                onClick={handleImport}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              >
                {importing ? "Importing..." : done ? "Re-run" : "Import All"}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-400">
                        {r.rowNumber}
                      </td>
                      <td className="px-3 py-2 text-zinc-900">
                        {r.title || (
                          <span className="text-red-500">Missing title</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.status === "pending" && (
                          <span className="text-zinc-400">Pending</span>
                        )}
                        {r.status === "importing" && (
                          <span className="text-brand-text">Importing...</span>
                        )}
                        {r.status === "done" && (
                          <span className="text-green-600">Imported</span>
                        )}
                        {r.status === "error" && (
                          <span className="text-red-600" title={r.error}>
                            Failed: {r.error}
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
