import {
  Bricolage_Grotesque,
  Fraunces,
  JetBrains_Mono,
  Nunito,
  Playfair_Display,
  Space_Grotesk,
  Syne,
} from "next/font/google";
import type { CSSProperties } from "react";
import type {
  GallerySettings,
  StyleFontKey,
  StyleTheme,
} from "@/lib/cms/styleLibrary";

/*
 * Fonts and colours for Prompt Style Pages. Fonts are self-hosted
 * by next/font and not preloaded: a browser only downloads the
 * ones a page actually uses.
 */

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--sl-font-grotesk",
  preload: false,
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--sl-font-trendy",
  preload: false,
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sl-font-editorial",
  preload: false,
});
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sl-font-softserif",
  preload: false,
});
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--sl-font-rounded",
  preload: false,
});
const syne = Syne({
  subsets: ["latin"],
  variable: "--sl-font-display",
  preload: false,
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--sl-font-mono",
  preload: false,
});

// Put on the page root so every font variable is defined.
export const STYLE_FONT_VARIABLES = [
  spaceGrotesk.variable,
  bricolage.variable,
  playfair.variable,
  fraunces.variable,
  nunito.variable,
  syne.variable,
  jetbrains.variable,
].join(" ");

const FONT_STACKS: Record<StyleFontKey, string> = {
  modern: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  grotesk: "var(--sl-font-grotesk), ui-sans-serif, system-ui, sans-serif",
  trendy: "var(--sl-font-trendy), ui-sans-serif, system-ui, sans-serif",
  editorial: "var(--sl-font-editorial), Georgia, serif",
  softserif: "var(--sl-font-softserif), Georgia, serif",
  rounded: "var(--sl-font-rounded), ui-rounded, system-ui, sans-serif",
  display: "var(--sl-font-display), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--sl-font-mono), ui-monospace, monospace",
};

export function fontStack(key: StyleFontKey): string {
  return FONT_STACKS[key] || FONT_STACKS.modern;
}

// Perceived brightness of a #RRGGBB colour, 0 (black) – 1 (white).
function luminance(color: string): number {
  const n = parseInt(color.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Readable text colour to place on top of a filled colour.
export function onColor(color: string): string {
  return luminance(color) > 0.6 ? "#111111" : "#FFFFFF";
}

/*
 * CSS variables used by StyleLibraryPage (all --sl-*). Softer
 * shades (muted text, lines, panels) are mixed from the five
 * chosen colours so any combination stays consistent.
 */
export function themeVariables(
  theme: StyleTheme,
  settings: Pick<GallerySettings, "headingFont" | "bodyFont">
): CSSProperties {
  return {
    "--sl-bg": theme.background,
    "--sl-surface": theme.surface,
    "--sl-ink": theme.ink,
    "--sl-accent": theme.accent,
    "--sl-accent2": theme.accent2,
    "--sl-on-ink": onColor(theme.ink),
    "--sl-on-accent": onColor(theme.accent),
    "--sl-muted": `color-mix(in srgb, ${theme.ink} 68%, ${theme.background})`,
    "--sl-line": `color-mix(in srgb, ${theme.ink} 13%, ${theme.background})`,
    "--sl-soft": `color-mix(in srgb, ${theme.ink} 5%, ${theme.surface})`,
    "--sl-panel": `color-mix(in srgb, ${theme.ink} 14%, ${theme.background})`,
    "--sl-accent2-soft": `color-mix(in srgb, ${theme.accent2} 14%, ${theme.surface})`,
    "--sl-accent2-line": `color-mix(in srgb, ${theme.accent2} 30%, ${theme.surface})`,
    "--sl-heading": fontStack(settings.headingFont),
    "--sl-body": fontStack(settings.bodyFont),
    fontFamily: "var(--sl-body)",
    backgroundColor: "var(--sl-bg)",
    color: "var(--sl-ink)",
  } as CSSProperties;
}
