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
          isActive ? "text-brand-text" : "text-neutral-400 hover:text-white"
        }`}
      >
        {label}
        <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-xl">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm ${
                pathname.startsWith(item.href)
                  ? "bg-white/5 text-brand-text"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
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
