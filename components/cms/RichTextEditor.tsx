"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import { useState } from "react";
import Callout, {
  type CalloutType,
} from "./extensions/Callout";
import FigureImage from "./extensions/FigureImage";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Yellow", value: "#eab308" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
];

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand underline",
        },
      }),
      FigureImage,
      Youtube.configure({
        nocookie: true,
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "rounded-lg mx-auto",
        },
      }),
      Callout,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[300px] rounded-b-xl border border-t-0 border-zinc-200 bg-white px-4 py-4 outline-none focus:border-brand",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  async function uploadFile(
    file: File
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "/api/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error || "Upload failed."
      );
    }

    return result.url as string;
  }

  async function handleImageUpload(
    file: File
  ) {
    setUploading(true);

    try {
      const url = await uploadFile(file);

      const caption = window.prompt(
        "Caption (optional):"
      );

      editor!
        .chain()
        .focus()
        .setFigureImage({
          src: url,
          alt: caption || "",
          caption: caption || "",
        })
        .run();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleImageFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      handleImageUpload(file);
    }

    event.target.value = "";
  }

  function insertImageFromUrl() {
    const url = window.prompt(
      "Image URL:"
    );

    if (!url) {
      return;
    }

    const caption = window.prompt(
      "Caption (optional):"
    );

    editor!
      .chain()
      .focus()
      .setFigureImage({
        src: url,
        alt: caption || "",
        caption: caption || "",
      })
      .run();
  }

  function insertLink() {
    const url = window.prompt("Link URL:");

    if (url) {
      editor!
        .chain()
        .focus()
        .setLink({ href: url })
        .run();
    }
  }

  function insertTable() {
    editor!
      .chain()
      .focus()
      .insertTable({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      })
      .run();
  }

  function insertYoutube() {
    const url = window.prompt(
      "YouTube video URL:"
    );

    if (url) {
      editor!
        .chain()
        .focus()
        .setYoutubeVideo({ src: url })
        .run();
    }
  }

  function insertCallout(
    type: CalloutType
  ) {
    editor!
      .chain()
      .focus()
      .setCallout(type)
      .run();
  }

  const buttonClass = (active: boolean) =>
    `rounded-md px-2.5 py-1.5 text-sm transition ${
      active
        ? "bg-brand text-zinc-900"
        : "text-zinc-400 hover:bg-zinc-100"
    }`;

  return (
    <div className="rounded-xl border border-zinc-200">
      {/* Toolbar */}

      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-zinc-200 bg-white p-2">
        <select
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                  ? "h3"
                  : "p"
          }
          onChange={(e) => {
            const value = e.target.value;

            if (value === "p") {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = Number(
                value.replace("h", "")
              ) as 1 | 2 | 3;

              editor
                .chain()
                .focus()
                .toggleHeading({ level })
                .run();
            }
          }}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))}>
          <b>B</b>
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))}>
          <i>I</i>
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={buttonClass(editor.isActive("underline"))}>
          <u>U</u>
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={buttonClass(editor.isActive("strike"))}>
          <s>S</s>
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        {/* Text color */}

        <select
          value={editor.getAttributes("textStyle").color || ""}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              editor.chain().focus().setColor(value).run();
            } else {
              editor.chain().focus().unsetColor().run();
            }
          }}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none"
          title="Text color"
        >
          {TEXT_COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              🎨 {c.label}
            </option>
          ))}
        </select>

        {/* Highlight color */}

        <select
          value={editor.getAttributes("highlight").color || ""}
          onChange={(e) => {
            const value = e.target.value;

            if (value) {
              editor.chain().focus().setHighlight({ color: value }).run();
            } else {
              editor.chain().focus().unsetHighlight().run();
            }
          }}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none"
          title="Highlight"
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              🖍 {c.label}
            </option>
          ))}
        </select>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        {/* Alignment */}

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={buttonClass(editor.isActive({ textAlign: "left" }))} title="Align left">
          ⬅
        </button>

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={buttonClass(editor.isActive({ textAlign: "center" }))} title="Align center">
          ⬌
        </button>

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={buttonClass(editor.isActive({ textAlign: "right" }))} title="Align right">
          ➡
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))}>
          • List
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive("orderedList"))}>
          1. List
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive("blockquote"))}>
          ❝ Quote
        </button>

        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={buttonClass(editor.isActive("codeBlock"))}>
          {"</>"}
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        {/* Callouts */}

        <select
          value=""
          onChange={(e) => {
            const value = e.target.value as CalloutType | "";

            if (value) {
              insertCallout(value);
              e.target.value = "";
            }
          }}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none"
          title="Insert callout box"
        >
          <option value="">+ Callout</option>
          <option value="note">📘 Note</option>
          <option value="tip">💡 Tip</option>
          <option value="warning">⚠️ Warning</option>
          <option value="info">ℹ️ Info</option>
        </select>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        <button type="button" onClick={insertLink} className={buttonClass(editor.isActive("link"))}>
          🔗 Link
        </button>

        <label className={`cursor-pointer ${buttonClass(false)}`}>
          {uploading ? "Uploading..." : "🖼 Upload Image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageFileSelected}
            disabled={uploading}
            className="sr-only"
          />
        </label>

        <button type="button" onClick={insertImageFromUrl} className={buttonClass(false)}>
          🖼 Image URL
        </button>

        {editor.isActive("figureImage") && (
          <>
            <button type="button" onClick={() => editor.chain().focus().setImageAlign("left").run()} className={buttonClass(false)} title="Align image left">
              🖼⬅
            </button>
            <button type="button" onClick={() => editor.chain().focus().setImageAlign("center").run()} className={buttonClass(false)} title="Align image center">
              🖼⬌
            </button>
            <button type="button" onClick={() => editor.chain().focus().setImageAlign("right").run()} className={buttonClass(false)} title="Align image right">
              🖼➡
            </button>
          </>
        )}

        <button type="button" onClick={insertYoutube} className={buttonClass(false)}>
          ▶ YouTube
        </button>

        <button type="button" onClick={insertTable} className={buttonClass(false)}>
          ⊞ Table
        </button>

        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={buttonClass(false)}>
          ─ Divider
        </button>

        <div className="mx-1 h-6 w-px bg-zinc-100" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={buttonClass(false)}>
          ↶ Undo
        </button>

        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={buttonClass(false)}>
          ↷ Redo
        </button>
      </div>

      {/* Editable area */}

      <EditorContent editor={editor} />
    </div>
  );
}
