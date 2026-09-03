import type { HeadingEntry } from "@/lib/cms/tableOfContents";

type TableOfContentsProps = {
  headings: HeadingEntry[];
};

export default function TableOfContents({
  headings,
}: TableOfContentsProps) {
  if (headings.length < 2) {
    return null;
  }

  return (
    <nav className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-text">
        On this page
      </p>

      <ul className="space-y-2 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{
              marginLeft:
                (heading.level - 1) * 16,
            }}
          >
            <a
              href={`#${heading.id}`}
              className="text-zinc-600 transition hover:text-brand-text"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
