import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Appends -2, -3, etc. until an unused slug is found.
export async function generateUniqueGroupSlug(
  name: string
): Promise<string> {
  const base = slugify(name) || "group";
  let candidate = base;
  let suffix = 2;

  // Capped at 50 attempts so a pathological case can't loop forever.
  for (let attempts = 0; attempts < 50; attempts++) {
    const { data, error } = await supabaseAuthClient
      .from("groups")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      console.error(
        "generateUniqueGroupSlug: lookup failed:",
        error.message
      );
      // Fall back to a random suffix rather than blocking group creation.
      return `${base}-${Math.random().toString(36).slice(2, 7)}`;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
