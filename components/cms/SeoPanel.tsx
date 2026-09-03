"use client";

import { useState } from "react";
import type { SeoFields } from "@/lib/cms/seoFields";

type SeoPanelProps = {
  seo: SeoFields;
  onChange: (next: SeoFields) => void;

  /*
   * Used by the "Auto-fill" button to guess
   * sensible starting values from the content
   * the employee already typed elsewhere in
   * the form (title, excerpt/summary, image).
   */
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedImageUrl?: string;
};

type Tab = "seo" | "social";

export default function SeoPanel({
  seo,
  onChange,
  suggestedTitle,
  suggestedDescription,
  suggestedImageUrl,
}: SeoPanelProps) {
  const [tab, setTab] = useState<Tab>("seo");

  function update(
    partial: Partial<SeoFields>
  ) {
    onChange({ ...seo, ...partial });
  }

  function handleAutoFill() {
    update({
      metaTitle:
        seo.metaTitle ||
        suggestedTitle ||
        "",
      metaDescription:
        seo.metaDescription ||
        suggestedDescription ||
        "",
      ogTitle:
        seo.ogTitle ||
        suggestedTitle ||
        "",
      ogDescription:
        seo.ogDescription ||
        suggestedDescription ||
        "",
      ogImageUrl:
        seo.ogImageUrl ||
        suggestedImageUrl ||
        "",
    });
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-brand";

  const labelClass =
    "mb-1 block text-xs font-medium text-zinc-600";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          SEO & Social Media
        </h3>

        <button
          type="button"
          onClick={handleAutoFill}
          className="rounded-md border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-brand/10"
        >
          Auto-fill from content
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 px-4">
        <button
          type="button"
          onClick={() => setTab("seo")}
          className={`border-b-2 px-1 py-2 text-sm ${
            tab === "seo"
              ? "border-brand text-zinc-900"
              : "border-transparent text-zinc-600 hover:text-zinc-600"
          }`}
        >
          SEO
        </button>

        <button
          type="button"
          onClick={() => setTab("social")}
          className={`border-b-2 px-1 py-2 text-sm ${
            tab === "social"
              ? "border-brand text-zinc-900"
              : "border-transparent text-zinc-600 hover:text-zinc-600"
          }`}
        >
          Social Media
        </button>
      </div>

      {/* SEO tab */}
      {tab === "seo" && (
        <div className="space-y-4 p-4">
          <div>
            <label className={labelClass}>
              Meta Title
            </label>
            <input
              className={inputClass}
              value={seo.metaTitle}
              placeholder={
                suggestedTitle ||
                "Shown as the page title in Google search"
              }
              onChange={(e) =>
                update({
                  metaTitle: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Meta Description
            </label>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={seo.metaDescription}
              placeholder={
                suggestedDescription ||
                "Shown as the snippet under the title in Google search"
              }
              onChange={(e) =>
                update({
                  metaDescription:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Meta Keywords{" "}
              <span className="text-zinc-600">
                (comma separated, optional)
              </span>
            </label>
            <input
              className={inputClass}
              value={seo.metaKeywords}
              placeholder="ai prompts, chatgpt, writing"
              onChange={(e) =>
                update({
                  metaKeywords:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Image Alt Text
            </label>
            <input
              className={inputClass}
              value={seo.imageAltText}
              placeholder="Describe the featured image for accessibility"
              onChange={(e) =>
                update({
                  imageAltText:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Canonical URL{" "}
              <span className="text-zinc-600">
                (optional)
              </span>
            </label>
            <input
              className={inputClass}
              value={seo.canonicalUrl}
              placeholder="https://aicheatbook.com/..."
              onChange={(e) =>
                update({
                  canonicalUrl:
                    e.target.value,
                })
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={!seo.isIndexed}
              onChange={(e) =>
                update({
                  isIndexed:
                    !e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-zinc-300 bg-white"
            />
            Block search engines (noindex)
          </label>
        </div>
      )}

      {/* Social tab */}
      {tab === "social" && (
        <div className="space-y-4 p-4">
          <div>
            <label className={labelClass}>
              Open Graph Title
            </label>
            <input
              className={inputClass}
              value={seo.ogTitle}
              placeholder={
                suggestedTitle ||
                "Title shown when shared on social media"
              }
              onChange={(e) =>
                update({
                  ogTitle: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Open Graph Description
            </label>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={seo.ogDescription}
              placeholder={
                suggestedDescription ||
                "Description shown when shared on social media"
              }
              onChange={(e) =>
                update({
                  ogDescription:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Open Graph Image URL
            </label>
            <input
              className={inputClass}
              value={seo.ogImageUrl}
              placeholder={
                suggestedImageUrl ||
                "Image shown when shared on social media"
              }
              onChange={(e) =>
                update({
                  ogImageUrl:
                    e.target.value,
                })
              }
            />

            {seo.ogImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seo.ogImageUrl}
                alt="Open Graph preview"
                className="mt-2 h-32 w-full rounded-lg border border-zinc-200 object-cover"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
