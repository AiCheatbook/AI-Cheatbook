import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/*
 * Resolves a Category / Subcategory / Concept path from plain
 * text names typed in an Excel row — reusing whatever already
 * exists (matched by slug) and creating whatever doesn't, so
 * bulk-importing 200 prompts under "AI Filmmaking" only creates
 * that category once, not 200 times.
 *
 * Returns the resulting concept_id, or null if no category name
 * was given at all (an uncategorized prompt is still valid).
 */
export async function findOrCreateTaxonomyPath(
  categoryName?: string,
  subcategoryName?: string,
  conceptName?: string
): Promise<string | null> {
  const category = categoryName?.trim();
  if (!category) return null;

  const categorySlug = generateSlug(category);

  let categoryId: string;
  const { data: existingCategory } = await supabase
    .from("prompt_categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (existingCategory) {
    categoryId = existingCategory.id;
  } else {
    const { data: newCategory, error } = await supabase
      .from("prompt_categories")
      .insert({ name: category, slug: categorySlug })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create category "${category}": ${error.message}`);
    }
    categoryId = newCategory.id;
  }

  const subcategory = subcategoryName?.trim();
  if (!subcategory) return null;

  const subcategorySlug = generateSlug(subcategory);

  let subcategoryId: string;
  const { data: existingSubcategory } = await supabase
    .from("prompt_subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .eq("slug", subcategorySlug)
    .maybeSingle();

  if (existingSubcategory) {
    subcategoryId = existingSubcategory.id;
  } else {
    const { data: newSubcategory, error } = await supabase
      .from("prompt_subcategories")
      .insert({
        category_id: categoryId,
        name: subcategory,
        slug: subcategorySlug,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Failed to create subcategory "${subcategory}": ${error.message}`
      );
    }
    subcategoryId = newSubcategory.id;
  }

  const concept = conceptName?.trim();
  if (!concept) return null;

  const conceptSlug = generateSlug(concept);

  const { data: existingConcept } = await supabase
    .from("prompt_concepts")
    .select("id")
    .eq("subcategory_id", subcategoryId)
    .eq("slug", conceptSlug)
    .maybeSingle();

  if (existingConcept) {
    return existingConcept.id;
  }

  const { data: newConcept, error } = await supabase
    .from("prompt_concepts")
    .insert({
      subcategory_id: subcategoryId,
      name: concept,
      slug: conceptSlug,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create concept "${concept}": ${error.message}`);
  }

  return newConcept.id;
}
