"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { findOrCreateTaxonomyPath } from "@/lib/cms/taxonomyImport";
import { findOrCreateKeywords } from "@/lib/cms/keywordLibrary";

const COLUMNS = [
  "Title",
  "Main Category",
  "Subcategory",
  "Concept",
  "AI Tools",
  "Prompt Text",
  "Description",
  "Keywords",
  "Published",
];

const EXAMPLE_ROW = [
  "Cinematic Static Shot",
  "AI Filmmaking",
  "Camera Movement",
  "Static Shot",
  "Runway, Veo",
  "A static, locked-off shot of...",
  "A prompt for a still, tripod-style camera setup.",
  "static shot, locked-off, tripod shot",
  "yes",
];

type ParsedRow = {
  rowNumber: number;
  title: string;
  mainCategory: string;
  subcategory: string;
  concept: string;
  aiTools: string;
  promptText: string;
  description: string;
  keywords: string;
  published: string;
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

export default function BulkImportPromptsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([COLUMNS, EXAMPLE_ROW]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prompts");
    XLSX.writeFile(workbook, "prompt-library-import-template.xlsx");
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
        rowNumber: i + 2, // +2: header row + 1-indexed
        title: cell(row, "Title"),
        mainCategory: cell(row, "Main Category"),
        subcategory: cell(row, "Subcategory"),
        concept: cell(row, "Concept"),
        aiTools: cell(row, "AI Tools"),
        promptText: cell(row, "Prompt Text"),
        description: cell(row, "Description"),
        keywords: cell(row, "Keywords"),
        published: cell(row, "Published"),
        status: "pending",
      }));

      setRows(parsed);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? `Couldn't read that file: ${err.message}`
          : "Couldn't read that file."
      );
      setRows([]);
    }
  }

  async function ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const { data } = await supabase
        .from("library_items")
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
            idx === i ? { ...r, status: "error", error: "Missing title" } : r
          )
        );
        continue;
      }

      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "importing" } : r))
      );

      try {
        const slug = await ensureUniqueSlug(generateSlug(row.title));

        const conceptId = await findOrCreateTaxonomyPath(
          row.mainCategory || undefined,
          row.subcategory || undefined,
          row.concept || undefined
        );

        const aiTools = row.aiTools
          ? row.aiTools.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        const { data: inserted, error: insertError } = await supabase
          .from("library_items")
          .insert({
            title: row.title,
            slug,
            type: "prompt",
            category: "text",
            description: row.description || null,
            prompt: row.promptText || null,
            ai_tools: aiTools,
            concept_id: conceptId,
            is_published: row.published.toLowerCase().startsWith("y"),
            published_at: row.published.toLowerCase().startsWith("y")
              ? new Date().toISOString()
              : null,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        if (row.keywords) {
          const keywordLabels = row.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);

          if (keywordLabels.length > 0) {
            const keywords = await findOrCreateKeywords(keywordLabels, {
              conceptId,
            });

            const { error: linkError } = await supabase
              .from("library_item_keywords")
              .insert(
                keywords.map((k, idx) => ({
                  library_item_id: inserted.id,
                  keyword_id: k.id,
                  sort_order: idx,
                }))
              );

            if (linkError) {
              throw new Error(`Prompt saved, but keywords failed: ${linkError.message}`);
            }
          }
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
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Bulk Import Prompts</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Upload an Excel file to create many prompts at once. Category,
          Subcategory, and Concept names are matched to existing taxonomy
          entries or created automatically. Keywords are matched or created
          in the shared Global Keyword Library — comma-separate multiple.
        </p>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            Expected columns
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {COLUMNS.join(" · ")}
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand/50"
          >
            Download Template
          </button>
        </div>

        <div className="mt-6">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 hover:border-brand/50">
            {fileName || "Choose an Excel file (.xlsx)..."}
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
                {rows.length} row{rows.length === 1 ? "" : "s"} found
                {done && (
                  <>
                    {" "}
                    — {successCount} imported
                    {errorCount > 0 && `, ${errorCount} failed`}
                  </>
                )}
              </p>
              <button
                type="button"
                disabled={importing}
                onClick={handleImport}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              >
                {importing
                  ? "Importing..."
                  : done
                    ? "Re-run Import"
                    : "Import All"}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Category Path</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-3 py-2 text-zinc-500">
                        {row.rowNumber}
                      </td>
                      <td className="px-3 py-2">{row.title || "—"}</td>
                      <td className="px-3 py-2 text-zinc-600">
                        {[row.mainCategory, row.subcategory, row.concept]
                          .filter(Boolean)
                          .join(" → ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "pending" && (
                          <span className="text-zinc-400">Pending</span>
                        )}
                        {row.status === "importing" && (
                          <span className="text-brand-text">
                            Importing...
                          </span>
                        )}
                        {row.status === "done" && (
                          <span className="text-green-600">Done</span>
                        )}
                        {row.status === "error" && (
                          <span
                            className="text-red-600"
                            title={row.error}
                          >
                            Failed: {row.error}
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

        {done && errorCount === 0 && rows.length > 0 && (
          <button
            type="button"
            onClick={() => router.push("/admin/prompts")}
            className="mt-6 text-sm font-semibold text-brand-text hover:underline"
          >
            View Prompt Library →
          </button>
        )}
      </div>
    </main>
  );
}
