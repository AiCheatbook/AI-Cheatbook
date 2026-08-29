import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import type { SelectedKeyword } from "@/components/cms/KeywordTagInput";

/*
 * Saves the keyword tags for a prompt.
 *
 * - Any keyword that doesn't exist yet
 *   (id starts with "new:") gets created
 *   in library_keywords first.
 * - Then we replace all of this prompt's
 *   keyword links with the current list,
 *   in order.
 */

export async function saveLibraryItemKeywords(
  libraryItemId: string,
  keywords: SelectedKeyword[]
) {
  const resolvedKeywords: SelectedKeyword[] =
    [];

  for (const keyword of keywords) {
    if (!keyword.id.startsWith("new:")) {
      resolvedKeywords.push(keyword);
      continue;
    }

    const { data, error } = await supabase
      .from("library_keywords")
      .insert({ label: keyword.label })
      .select("id, label")
      .single();

    if (error) {
      throw new Error(
        `Failed to create keyword "${keyword.label}": ${error.message}`
      );
    }

    resolvedKeywords.push({
      id: data.id,
      label: data.label,
    });
  }

  const { error: deleteError } =
    await supabase
      .from("library_item_keywords")
      .delete()
      .eq(
        "library_item_id",
        libraryItemId
      );

  if (deleteError) {
    throw new Error(
      `Failed to update keyword links: ${deleteError.message}`
    );
  }

  if (resolvedKeywords.length === 0) {
    return;
  }

  const rows = resolvedKeywords.map(
    (keyword, index) => ({
      library_item_id: libraryItemId,
      keyword_id: keyword.id,
      sort_order: index,
    })
  );

  const { error: insertError } =
    await supabase
      .from("library_item_keywords")
      .insert(rows);

  if (insertError) {
    throw new Error(
      `Failed to save keyword links: ${insertError.message}`
    );
  }
}
