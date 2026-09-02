"use client";

import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { blocksToHtml } from "@/lib/cms/blocksToHtml";

type LogLine = {
  text: string;
  isError?: boolean;
};

export default function MigrateContentPage() {
  const [running, setRunning] =
    useState(false);
  const [log, setLog] = useState<
    LogLine[]
  >([]);

  function addLog(
    text: string,
    isError = false
  ) {
    setLog((current) => [
      ...current,
      { text, isError },
    ]);
  }

  async function migrateNews() {
    addLog("— Migrating News —");

    const { data: newsRows, error } =
      await supabase
        .from("news")
        .select("id, title")
        .is("content_html", null);

    if (error) {
      addLog(
        `Failed to load news: ${error.message}`,
        true
      );
      return;
    }

    if (
      !newsRows ||
      newsRows.length === 0
    ) {
      addLog(
        "Nothing to migrate — all News articles already have rich content, or none exist."
      );
      return;
    }

    for (const row of newsRows) {
      const {
        data: blocks,
        error: blocksError,
      } = await supabase
        .from("news_blocks")
        .select("block_type, content")
        .eq("news_id", row.id)
        .order("sort_order", {
          ascending: true,
        });

      if (blocksError) {
        addLog(
          `Skipped "${row.title}": ${blocksError.message}`,
          true
        );
        continue;
      }

      const html = blocksToHtml(
        blocks || []
      );

      const { error: updateError } =
        await supabase
          .from("news")
          .update({
            content_html: html,
          })
          .eq("id", row.id);

      if (updateError) {
        addLog(
          `Failed to save "${row.title}": ${updateError.message}`,
          true
        );
      } else {
        addLog(
          `✓ Migrated "${row.title}"`
        );
      }
    }
  }

  async function migrateLearningCards() {
    addLog("— Migrating Learning Cards —");

    const {
      data: cardRows,
      error,
    } = await supabase
      .from("learning_cards")
      .select("id, title")
      .is("content_html", null);

    if (error) {
      addLog(
        `Failed to load learning cards: ${error.message}`,
        true
      );
      return;
    }

    if (
      !cardRows ||
      cardRows.length === 0
    ) {
      addLog(
        "Nothing to migrate — all Learning Cards already have rich content, or none exist."
      );
      return;
    }

    for (const row of cardRows) {
      const {
        data: blocks,
        error: blocksError,
      } = await supabase
        .from("learning_card_blocks")
        .select("block_type, content")
        .eq("learning_card_id", row.id)
        .order("sort_order", {
          ascending: true,
        });

      if (blocksError) {
        addLog(
          `Skipped "${row.title}": ${blocksError.message}`,
          true
        );
        continue;
      }

      const html = blocksToHtml(
        blocks || []
      );

      const { error: updateError } =
        await supabase
          .from("learning_cards")
          .update({
            content_html: html,
          })
          .eq("id", row.id);

      if (updateError) {
        addLog(
          `Failed to save "${row.title}": ${updateError.message}`,
          true
        );
      } else {
        addLog(
          `✓ Migrated "${row.title}"`
        );
      }
    }
  }

  async function migratePrompts() {
    addLog(
      "— Migrating Prompt Library descriptions —"
    );

    const {
      data: promptRows,
      error,
    } = await supabase
      .from("library_items")
      .select("id, title, description")
      .is("description_html", null);

    if (error) {
      addLog(
        `Failed to load prompts: ${error.message}`,
        true
      );
      return;
    }

    if (
      !promptRows ||
      promptRows.length === 0
    ) {
      addLog(
        "Nothing to migrate — all prompts already have a rich description, or none exist."
      );
      return;
    }

    for (const row of promptRows) {
      const plain = (
        row.description || ""
      ).trim();

      const html = plain
        ? `<p>${plain
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(
              />/g,
              "&gt;"
            )}</p>`
        : "";

      const { error: updateError } =
        await supabase
          .from("library_items")
          .update({
            description_html: html,
          })
          .eq("id", row.id);

      if (updateError) {
        addLog(
          `Failed to save "${row.title}": ${updateError.message}`,
          true
        );
      } else {
        addLog(
          `✓ Migrated "${row.title}"`
        );
      }
    }
  }

  async function runMigration() {
    setRunning(true);
    setLog([]);

    try {
      await migrateNews();
      await migrateLearningCards();
      await migratePrompts();
      addLog("— Done —");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          Migrate Content to Rich Text
        </h1>

        <p className="mt-3 text-zinc-400">
          One-time tool. Converts your
          existing News articles and
          Learning Cards (currently stored
          as separate blocks) and Prompt
          descriptions into the new rich
          text format. Safe to run more
          than once — anything already
          migrated is skipped.
        </p>

        <button
          type="button"
          disabled={running}
          onClick={runMigration}
          className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {running
            ? "Migrating..."
            : "Run Migration"}
        </button>

        {log.length > 0 && (
          <div className="mt-8 max-h-[500px] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 font-mono text-sm">
            {log.map((line, index) => (
              <div
                key={index}
                className={
                  line.isError
                    ? "text-red-400"
                    : "text-zinc-400"
                }
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
