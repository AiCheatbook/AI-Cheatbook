import { supabase } from "./client";

export async function getLibraryItems() {
  const { data, error } = await supabase
    .from("library_items")
    .select(`
      *,
      library_item_keywords (
        sort_order,
        library_keywords (
          id,
          label,
          description,
          category
        )
      )
    `)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      [
        "SUPABASE LIST ERROR",
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data;
}

export async function getLibraryItem(slug: string) {
  const { data, error } = await supabase
    .from("library_items")
    .select(`
      *,
      library_item_keywords (
        sort_order,
        library_keywords (
          id,
          label,
          description,
          category
        )
      ),
      library_comments (
        id,
        author_name,
        comment,
        comment_type
      )
    `)
    .eq("slug", slug)
    .single();

  // No matching slug
  if (error?.code === "PGRST116") {
    return null;
  }

  if (error) {
    throw new Error(
      [
        "SUPABASE LIBRARY ERROR",
        `Slug: ${slug}`,
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data;
}