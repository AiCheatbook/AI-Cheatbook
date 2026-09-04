import DOMPurify from "isomorphic-dompurify";
import { addHeadingIds } from "@/lib/cms/tableOfContents";
import TableOfContents from "./TableOfContents";

type RichContentRendererProps = {
  html: string;
  showToc?: boolean;
};

export default function RichContentRenderer({
  html,
  showToc = false,
}: RichContentRendererProps) {
  const { html: htmlWithIds, headings } =
    showToc
      ? addHeadingIds(html)
      : { html, headings: [] };

  const safeHtml = DOMPurify.sanitize(
    htmlWithIds,
    {
      ADD_TAGS: [
        "iframe",
        "figure",
        "figcaption",
      ],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "target",
        "data-callout",
        "data-align",
        "id",
      ],
    }
  );

  return (
    <>
      {showToc && (
        <TableOfContents
          headings={headings}
        />
      )}

      <div
        className="prose max-w-none prose-headings:scroll-mt-24 prose-headings:text-zinc-900 prose-a:text-brand-text prose-blockquote:border-brand prose-code:text-brand-text"
        dangerouslySetInnerHTML={{
          __html: safeHtml,
        }}
      />
    </>
  );
}
