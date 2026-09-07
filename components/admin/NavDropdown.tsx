"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavDropdownItem = {
  href: string;
  label: string;
};

type NavDropdownProps = {
  label: string;
  items: NavDropdownItem[];
  pathname: string;
};

export default function NavDropdown({
  label,
  items,
  pathname,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = items.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 ${
          isActive ? "text-brand-text" : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        {label}
        <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm ${
                pathname.startsWith(item.href)
                  ? "bg-zinc-50 text-brand-text"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
