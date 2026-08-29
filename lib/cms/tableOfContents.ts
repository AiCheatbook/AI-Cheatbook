export type HeadingEntry = {
  id: string;
  text: string;
  level: number;
};

function slugify(
  text: string,
  usedSlugs: Set<string>
): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

  let slug = base || "section";
  let counter = 2;

  while (usedSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  usedSlugs.add(slug);

  return slug;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .trim();
}

/*
 * Finds every h1/h2/h3 in the HTML, gives
 * each one a stable, unique id (so jump
 * links work), and returns both the
 * modified HTML and the list of headings
 * for rendering a table of contents.
 */

export function addHeadingIds(
  html: string
): {
  html: string;
  headings: HeadingEntry[];
} {
  const headings: HeadingEntry[] = [];
  const usedSlugs = new Set<string>();

  const updatedHtml = html.replace(
    /<h([1-3])([^>]*)>(.*?)<\/h\1>/gi,
    (
      match,
      levelStr,
      attrs,
      innerHtml
    ) => {
      const level = Number(levelStr);
      const text = stripTags(innerHtml);

      if (!text) {
        return match;
      }

      const id = slugify(
        text,
        usedSlugs
      );

      headings.push({
        id,
        text,
        level,
      });

      const hasId = /\bid=/.test(
        attrs
      );

      const newAttrs = hasId
        ? attrs
        : `${attrs} id="${id}"`;

      return `<h${levelStr}${newAttrs}>${innerHtml}</h${levelStr}>`;
    }
  );

  return {
    html: updatedHtml,
    headings,
  };
}
