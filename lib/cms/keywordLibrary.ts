import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export type KeywordRow = {
  id: string;
  label: string;
};

/*
 * Mirrors the database's generated normalized_label column
 * exactly (see database/056_keyword_library_normalization.sql):
 * lowercase, hyphens/underscores treated as spaces, repeated
 * whitespace collapsed, trimmed. "Static Shot", "static shot",
 * and "static-shot" all normalize to "static shot".
 */
export function normalizeKeywordLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * The single canonical entry point for creating or reusing a
 * keyword, used by every surface that lets someone type a new
 * one — Prompt Library's concept-scoped picker, Prompt Designer's
 * keyword search, anywhere else in the future. Guarantees the
 * whole app shares one Global Keyword Library:
 * - If a keyword with the same normalized text already exists
 *   (regardless of casing/hyphens), that existing row is reused,
 *   never duplicated.
 * - If not, a new row is created with the user's exact typed
 *   casing preserved as the display label.
 * - concept_id is only ever set when actually creating a brand
 *   new row — reusing an existing keyword never silently
 *   reassigns its concept.
 */
export async function findOrCreateKeyword(
  label: string,
  options?: { conceptId?: string | null }
): Promise<KeywordRow> {
  const trimmedLabel = label.trim();
  const normalized = normalizeKeywordLabel(trimmedLabel);

  const { data: existing, error: findError } = await supabaseAuthClient
    .from("library_keywords")
    .select("id, label")
    .eq("normalized_label", normalized)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to check for existing keyword: ${findError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabaseAuthClient
    .from("library_keywords")
    .insert({
      label: trimmedLabel,
      concept_id: options?.conceptId ?? null,
    })
    .select("id, label")
    .single();

  if (createError) {
    // Rare race: another request created the same normalized
    // keyword between our check above and this insert. Re-fetch
    // and return the row that won, rather than erroring out.
    if (createError.code === "23505") {
      const { data: winner, error: refetchError } = await supabaseAuthClient
        .from("library_keywords")
        .select("id, label")
        .eq("normalized_label", normalized)
        .single();

      if (!refetchError && winner) {
        return winner;
      }
    }

    throw new Error(`Failed to create keyword: ${createError.message}`);
  }

  return created;
}

/*
 * Bulk version for comma-separated input (e.g. "static shot,
 * static camera, locked-off shot"). Runs each through the same
 * find-or-create path, so mixing brand-new and already-existing
 * keywords in one paste works correctly and never creates
 * duplicates among them.
 */
export async function findOrCreateKeywords(
  labels: string[],
  options?: { conceptId?: string | null }
): Promise<KeywordRow[]> {
  const results: KeywordRow[] = [];

  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    results.push(await findOrCreateKeyword(trimmed, options));
  }

  return results;
}
