"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Lock, Plus, Trash2 } from "lucide-react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import {
  DEFAULT_SITE_SETTINGS,
  NAV_ITEMS,
  SITE_SETTINGS_ID,
  parseSiteSettings,
  type NavKey,
  type SiteSettings,
} from "@/lib/siteSettings";

/*
 * Site Settings: website icon (favicon), header logo, and on/off
 * switches for the header menu tabs and the "Create community"
 * button. Stored in the site_settings table.
 */

// Missing table: Postgres 42P01 on reads, PGRST205 from the API.
function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /could not find the table|relation .* does not exist/i.test(
          error.message || ""
        ))
  );
}

async function uploadFile(file: File): Promise<string> {
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

  return result.url as string;
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-brand" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ImagePicker({
  url,
  uploading,
  onUpload,
  onRemove,
  preview,
}: {
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {preview}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
          <ImagePlus className="h-4 w-4" />
          {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-red-300 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Use default
          </button>
        )}
      </div>
    </div>
  );
}

export default function SiteSettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [missingTable, setMissingTable] = useState(false);
  const [uploading, setUploading] = useState<"favicon" | "logo" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("site_settings")
        .select("settings")
        .eq("id", SITE_SETTINGS_ID)
        .maybeSingle();

      if (cancelled) return;

      if (isMissingTableError(loadError)) {
        setMissingTable(true);
      } else if (loadError) {
        setError(loadError.message);
      } else {
        setSettings(parseSiteSettings(data?.settings));
      }

      setChecking(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function update(patch: Partial<SiteSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    setNotice("");
  }

  function setNavVisible(key: NavKey, visible: boolean) {
    setSettings((prev) => ({
      ...prev,
      hiddenNav: visible
        ? prev.hiddenNav.filter((k) => k !== key)
        : [...prev.hiddenNav, key],
    }));
    setNotice("");
  }

  async function handleUpload(target: "favicon" | "logo", file: File) {
    setUploading(target);
    setError("");
    try {
      const url = await uploadFile(file);
      update(target === "favicon" ? { faviconUrl: url } : { logoUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { error: saveError } = await supabase.from("site_settings").upsert({
        id: SITE_SETTINGS_ID,
        settings,
        updated_at: new Date().toISOString(),
      });

      if (isMissingTableError(saveError)) {
        setMissingTable(true);
        throw new Error("Run the one-time database update first (see the box above).");
      }
      if (saveError) throw new Error(saveError.message);

      const refresh = await fetch("/api/site-settings/refresh", {
        method: "POST",
      });

      setNotice(
        refresh.ok
          ? "Saved. The website is updated — refresh any open page to see it."
          : "Saved. Pages will pick up the change within 5 minutes."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-zinc-200" />
      </main>
    );
  }

  const visibleTabs = NAV_ITEMS.filter(
    (item) => item.locked || !settings.hiddenNav.includes(item.key)
  );

  return (
    <main className="min-h-screen bg-zinc-50 pb-28 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Website theme, icon, header logo and which menu links are shown.
        </p>

        {missingTable && (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">One-time database update needed</p>
            <p className="mt-1">
              Run <code className="rounded bg-amber-100 px-1">database/061_site_settings.sql</code>{" "}
              in the Supabase SQL Editor, then reload this page. Until then the
              website uses the default icon and shows every menu link.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-5">
          <Section
            title="Website theme"
            hint="Light or dark colours for the whole website: homepage, every page and the menu."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["light", "Light", "White background, dark text"],
                  ["dark", "Dark", "Deep night background, glowing cards"],
                ] as const
              ).map(([value, label, description]) => {
                const selected = settings.homeTheme === value;
                const isDark = value === "dark";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ homeTheme: value })}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {/* Fixed colours so the previews look the same in
                        either theme. */}
                    <span
                      className={`block overflow-hidden rounded-xl border ${
                        isDark ? "border-white/10 bg-[#0B0F17]" : "border-[#E4E4E7] bg-[#FFFFFF]"
                      }`}
                    >
                      <span
                        className={`flex items-center gap-1.5 border-b px-2 py-1.5 ${
                          isDark ? "border-white/10" : "border-[#F4F4F5]"
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded bg-brand" />
                        <span className={`h-1.5 w-12 rounded ${isDark ? "bg-white/30" : "bg-[#D4D4D8]"}`} />
                      </span>
                      <span className="block h-10 bg-gradient-to-r from-violet-700 via-sky-600 to-fuchsia-500 opacity-80" />
                      <span className="flex gap-1.5 p-2">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-8 flex-1 rounded ${isDark ? "bg-white/10" : "bg-[#E4E4E7]"}`}
                          />
                        ))}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-zinc-900">
                      {label}
                    </span>
                    <span className="block text-xs text-zinc-500">{description}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title="Website icon"
            hint="The small picture on browser tabs and bookmarks. Use a square image, ideally 512 × 512 PNG."
          >
            <ImagePicker
              url={settings.faviconUrl}
              uploading={uploading === "favicon"}
              onUpload={(file) => handleUpload("favicon", file)}
              onRemove={() => update({ faviconUrl: "" })}
              preview={
                <div className="flex w-64 items-center gap-2 rounded-t-xl border border-b-0 border-zinc-200 bg-zinc-100 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.faviconUrl || "/favicon.ico"}
                    alt=""
                    className="h-4 w-4 object-contain"
                  />
                  <span className="truncate text-xs text-zinc-700">
                    AI Cheatbook — Learn, Create &amp; Grow
                  </span>
                </div>
              }
            />
          </Section>

          <Section
            title="Header logo"
            hint="Shown at the top left of every page, next to “AI Cheatbook”. Square images look best."
          >
            <ImagePicker
              url={settings.logoUrl}
              uploading={uploading === "logo"}
              onUpload={(file) => handleUpload("logo", file)}
              onRemove={() => update({ logoUrl: "" })}
              preview={
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-white">
                      AI
                    </span>
                  )}
                  <span className="text-lg font-bold">AI Cheatbook</span>
                </div>
              }
            />
            {settings.faviconUrl && settings.logoUrl !== settings.faviconUrl && (
              <button
                type="button"
                onClick={() => update({ logoUrl: settings.faviconUrl })}
                className="mt-3 text-sm font-semibold text-brand-text"
              >
                Use the website icon as the logo
              </button>
            )}
          </Section>

          <Section
            title="Menu"
            hint="Switch off any link you don't want in the top menu. Pages switched off stay reachable by direct link."
          >
            <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
              {NAV_ITEMS.map((item) => {
                const visible =
                  item.locked || !settings.hiddenNav.includes(item.key);
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className={`text-sm font-semibold ${visible ? "text-zinc-900" : "text-zinc-400"}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-zinc-400">{item.href}</p>
                    </div>
                    {item.locked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                        <Lock className="h-3.5 w-3.5" /> Always on
                      </span>
                    ) : (
                      <Toggle
                        checked={visible}
                        label={`Show ${item.label} in the menu`}
                        onChange={(value) => setNavVisible(item.key, value)}
                      />
                    )}
                  </li>
                );
              })}
              <li className="flex items-center justify-between gap-4 bg-zinc-50/60 px-4 py-3">
                <div>
                  <p
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      settings.showCreateCommunity ? "text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    “Create your Own AI Community” button
                  </p>
                  <p className="text-xs text-zinc-400">Top right of the header</p>
                </div>
                <Toggle
                  checked={settings.showCreateCommunity}
                  label="Show the Create community button"
                  onChange={(value) => update({ showCreateCommunity: value })}
                />
              </li>
            </ul>

            <p className="mt-4 text-xs font-semibold text-zinc-500">Preview</p>
            <div className="mt-2 flex gap-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white px-4 pt-3 text-sm">
              {visibleTabs.map((item, i) => (
                <span
                  key={item.key}
                  className={`shrink-0 border-b-4 pb-2 ${
                    i === 0
                      ? "border-brand font-semibold text-zinc-900"
                      : "border-transparent text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : notice ? (
              <p className="text-green-600">{notice}</p>
            ) : (
              <p className="text-zinc-500">Changes apply to the whole website.</p>
            )}
          </div>
          <button
            type="button"
            disabled={saving || missingTable}
            onClick={save}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
