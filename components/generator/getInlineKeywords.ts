import type { Editor } from "@tiptap/react";

/*
 * Reads inline keywords directly from
 * what's actually in the document right
 * now, rather than a separately-tracked
 * array. This is what makes "remove a
 * chip = remove that one instance" work
 * correctly, and what keeps duplicate
 * uses of the same keyword (e.g. "Static
 * Shot" used twice) naturally supported —
 * there's no separate list to get out of
 * sync with what the user actually typed.
 */

export function getInlineKeywordsFromDoc(
  editor: Editor
): string[] {
  const labels: string[] = [];

  editor.state.doc.descendants((node) => {
    if (node.type.name === "keywordChip") {
      labels.push(node.attrs.label);
    }
  });

  return labels;
}
