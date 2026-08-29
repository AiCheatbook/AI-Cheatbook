type ContentBlock = {
  block_type: string;
  content: Record<string, unknown>;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getString(
  value: unknown
): string {
  return typeof value === "string"
    ? value
    : "";
}

function getStringArray(
  value: unknown
): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string"
      )
    : [];
}

/*
 * Converts a list of old-style content
 * blocks (heading/paragraph/bullets/etc,
 * as used by News and Learning Cards)
 * into one HTML string for the new rich
 * text editor.
 */

export function blocksToHtml(
  blocks: ContentBlock[]
): string {
  const parts: string[] = [];

  for (const block of blocks) {
    const content = block.content || {};

    if (block.block_type === "heading") {
      const text = getString(
        content.text
      );

      if (text) {
        parts.push(
          `<h2>${escapeHtml(text)}</h2>`
        );
      }

      continue;
    }

    if (
      block.block_type === "paragraph"
    ) {
      const text = getString(
        content.text
      );

      if (text) {
        parts.push(
          `<p>${escapeHtml(text)}</p>`
        );
      }

      continue;
    }

    if (block.block_type === "bullets") {
      const items = getStringArray(
        content.items
      );

      if (items.length > 0) {
        const li = items
          .map(
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("");

        parts.push(`<ul>${li}</ul>`);
      }

      continue;
    }

    if (
      block.block_type === "numbered_list"
    ) {
      const items = getStringArray(
        content.items
      );

      if (items.length > 0) {
        const li = items
          .map(
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("");

        parts.push(`<ol>${li}</ol>`);
      }

      continue;
    }

    if (block.block_type === "image") {
      const url = getString(
        content.url
      );

      const alt = getString(
        content.alt
      );

      if (url) {
        parts.push(
          `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
        );
      }

      continue;
    }

    if (block.block_type === "video") {
      const url = getString(
        content.url
      );

      if (url) {
        /*
         * The new editor is text/image
         * focused; a plain video file
         * link is preserved as a link
         * so nothing is lost.
         */

        parts.push(
          `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></p>`
        );
      }

      continue;
    }

    if (block.block_type === "quote") {
      const text = getString(
        content.text
      );

      const author = getString(
        content.author
      );

      if (text) {
        const authorLine = author
          ? `<p>— ${escapeHtml(author)}</p>`
          : "";

        parts.push(
          `<blockquote><p>${escapeHtml(text)}</p>${authorLine}</blockquote>`
        );
      }

      continue;
    }

    if (block.block_type === "code") {
      const code = getString(
        content.code
      );

      if (code) {
        parts.push(
          `<pre><code>${escapeHtml(code)}</code></pre>`
        );
      }

      continue;
    }

    if (block.block_type === "divider") {
      parts.push("<hr />");
      continue;
    }
  }

  return parts.join("\n");
}
