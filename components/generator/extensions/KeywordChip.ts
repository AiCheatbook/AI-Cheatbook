import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    keywordChip: {
      insertKeywordChip: (
        label: string
      ) => ReturnType;
    };
  }
}

/*
 * A keyword that lives INSIDE the sentence
 * itself (e.g. "generate a [Static Shot] of
 * a girl standing") rather than in a
 * separate list. Renders as a single,
 * removable unit — pressing backspace right
 * after it deletes the whole chip in one
 * step, never leaving stray characters.
 */

export const KeywordChip = Node.create({
  name: "keywordChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-keyword-chip]",
        getAttrs: (element) => ({
          label:
            element.getAttribute(
              "data-keyword-chip"
            ) || "",
        }),
      },
    ];
  },

  renderHTML({
    node,
    HTMLAttributes,
  }) {
    return [
      "span",
      mergeAttributes(
        HTMLAttributes,
        {
          "data-keyword-chip":
            node.attrs.label,
          class: "keyword-chip-inline",
        }
      ),
      node.attrs.label,
    ];
  },

  renderText({ node }) {
    return node.attrs.label;
  },

  addCommands() {
    return {
      insertKeywordChip:
        (label: string) =>
        ({ commands }) => {
          return commands.insertContent([
            {
              type: this.name,
              attrs: { label },
            },
            { type: "text", text: " " },
          ]);
        },
    };
  },
});

export default KeywordChip;
