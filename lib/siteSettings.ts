import { supabase } from "@/lib/supabase/client";

/*
 * Site-wide settings edited at /admin/settings and stored in the
 * site_settings table (see database/061_site_settings.sql).
 */

export type NavKey =
  | "home"
  | "communities"
  | "prompts"
  | "generator"
  | "learning"
  | "news"
  | "notebook";

// The header tabs, in order. "match" lists extra path prefixes
// that highlight a tab (e.g. community pages under /groups).
export const NAV_ITEMS: {
  key: NavKey;
  href: string;
  label: string;
  match?: string[];
  // Home is always shown so visitors can get back.
  locked?: boolean;
}[] = [
  { key: "home", href: "/", label: "Home", locked: true },
  { key: "communities", href: "/community", label: "Communities", match: ["/groups"] },
  { key: "prompts", href: "/prompts", label: "Prompt Book" },
  { key: "generator", href: "/generator", label: "Prompt Designer" },
  { key: "learning", href: "/learning", label: "Learning" },
  { key: "news", href: "/news", label: "AI News" },
  { key: "notebook", href: "/notebook", label: "Notebook" },
];

export type SiteSettings = {
  faviconUrl: string;
  logoUrl: string;
  hiddenNav: NavKey[];
  showCreateCommunity: boolean;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  faviconUrl: "",
  logoUrl: "",
  hiddenNav: [],
  showCreateCommunity: true,
};

export const SITE_SETTINGS_ID = "global";

export function parseSiteSettings(raw: unknown): SiteSettings {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const hiddenNav = Array.isArray(obj.hiddenNav)
    ? (obj.hiddenNav as unknown[]).filter((key): key is NavKey =>
        NAV_ITEMS.some((item) => item.key === key && !item.locked)
      )
    : [];

  return {
    faviconUrl: typeof obj.faviconUrl === "string" ? obj.faviconUrl : "",
    logoUrl: typeof obj.logoUrl === "string" ? obj.logoUrl : "",
    hiddenNav,
    showCreateCommunity: obj.showCreateCommunity !== false,
  };
}

/*
 * Read on the server when pages are rendered. Falls back to the
 * defaults (everything on, built-in icon) if the table doesn't
 * exist yet or can't be reached, so the site never breaks.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("id", SITE_SETTINGS_ID)
      .maybeSingle();

    if (error) {
      console.error("Site settings: failed to load:", error.message);
      return DEFAULT_SITE_SETTINGS;
    }

    return parseSiteSettings(data?.settings);
  } catch (err) {
    console.error("Site settings: failed to load:", err);
    return DEFAULT_SITE_SETTINGS;
  }
}
