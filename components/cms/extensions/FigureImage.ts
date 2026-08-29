import { Node, mergeAttributes } from "@tiptap/core";

export type ImageAlign =
  | "left"
  | "center"
  | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (options: {
        src: string;
        alt?: string;
        caption?: string;
      }) => ReturnType;
      setImageAlign: (
        align: ImageAlign
      ) => ReturnType;
      setImageCaption: (
        caption: string
      ) => ReturnType;
    };
  }
}

/*
 * Renders as:
 * <figure data-align="center">
 *   <img src="..." alt="..." />
 *   <figcaption>...</figcaption>
 * </figure>
 *
 * The figcaption is only included when a
 * caption was actually set.
 */

export const FigureImage = Node.create({
  name: "figureImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: "",
      },
      caption: {
        default: "",
      },
      align: {
        default: "center",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-align]",
        getAttrs: (element) => {
          const img =
            element.querySelector(
              "img"
            );

          const figcaption =
            element.querySelector(
              "figcaption"
            );

          return {
            src:
              img?.getAttribute(
                "src"
              ) || null,
            alt:
              img?.getAttribute(
                "alt"
              ) || "",
            caption:
              figcaption?.textContent ||
              "",
            align:
              element.getAttribute(
                "data-align"
              ) || "center",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      caption,
      align,
    } = HTMLAttributes;

    const children: unknown[] = [
      [
        "img",
        { src, alt: alt || "" },
      ],
    ];

    if (caption) {
      children.push([
        "figcaption",
        {},
        caption,
      ]);
    }

    return [
      "figure",
      mergeAttributes(
        { "data-align": align },
        { class: `image-align-${align}` }
      ),
      ...children,
    ] as never;
  },

  addCommands() {
    return {
      setFigureImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt || "",
              caption:
                options.caption || "",
              align: "center",
            },
          });
        },

      setImageAlign:
        (align) =>
        ({
          commands,
          state,
        }) => {
          const { selection } = state;
          const node =
            selection.$anchor.nodeAfter ||
            selection.$anchor.nodeBefore;

          if (
            !node ||
            node.type.name !== this.name
          ) {
            return false;
          }

          return commands.updateAttributes(
            this.name,
            { align }
          );
        },

      setImageCaption:
        (caption) =>
        ({ commands }) => {
          return commands.updateAttributes(
            this.name,
            { caption }
          );
        },
    };
  },
});

export default FigureImage;
