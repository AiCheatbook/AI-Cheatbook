"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: "/community", label: "Home" },
      {
        href: "/community/search",
        label: "Search",
      },
      {
        href: "/community?filter=trending",
        label: "Trending",
      },
      {
        href: "/community?type=question",
        label: "Questions",
      },
      {
        href: "/community?type=discussion",
        label: "Discussions",
      },
      {
        href: "/community?type=poll",
        label: "Polls",
      },
    ],
  },
  {
    label: "My Community",
    items: [
      {
        href: "/community?filter=mine",
        label: "My Posts",
      },
    ],
  },
];

export default function CommunitySidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-20 space-y-6">
        {NAV_SECTIONS.map(
          (section, i) => (
            <div key={i}>
              {section.label && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  {section.label}
                </p>
              )}

              <nav className="space-y-0.5">
                {section.items.map(
                  (item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        pathname ===
                        item.href.split(
                          "?"
                        )[0]
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </nav>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
