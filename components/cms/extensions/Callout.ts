import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType =
  | "note"
  | "tip"
  | "warning"
  | "info";

export const CALLOUT_CLASSES: Record<
  CalloutType,
  string
> = {
  note: "callout-note",
  tip: "callout-tip",
  warning: "callout-warning",
  info: "callout-info",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (
        type: CalloutType
      ) => ReturnType;
    };
  }
}

/*
 * Renders as:
 * <div data-callout="note" class="callout-note">
 *   ...editable paragraph content...
 * </div>
 *
 * The icon/label (e.g. "📘 Note") is added
 * purely via CSS ::before in globals.css,
 * matching the data-callout attribute — so
 * no extra DOM structure is needed here,
 * keeping this safe to sanitize and render
 * anywhere.
 */

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) =>
          element.getAttribute(
            "data-callout"
          ) || "note",
        renderHTML: (attributes) => ({
          "data-callout":
            attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
      },
    ];
  },

  renderHTML({
    node,
    HTMLAttributes,
  }) {
    const type = (node.attrs.type ||
      "note") as CalloutType;

    return [
      "div",
      mergeAttributes(
        HTMLAttributes,
        {
          class: `callout ${
            CALLOUT_CLASSES[type] ||
            CALLOUT_CLASSES.note
          }`,
        }
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },
    };
  },
});

export default Callout;
