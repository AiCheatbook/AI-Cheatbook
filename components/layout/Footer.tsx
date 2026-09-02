import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-900">

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-center md:justify-between">

        {/* Brand */}

        <div>
          <Link
            href="/"
            className="text-2xl font-bold text-zinc-900 transition hover:text-brand"
          >
            AI Cheatbook
          </Link>

          <p className="mt-2 max-w-sm text-zinc-600">
            Verified AI Prompts for Creators &
            Developers
          </p>
        </div>

        {/* Links */}

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-600">

          <Link
            href="/search"
            className="transition hover:text-brand"
          >
            Browse Prompts
          </Link>

          <Link
            href="/generator"
            className="transition hover:text-brand"
          >
            Generator
          </Link>

          <Link
            href="/news"
            className="transition hover:text-brand"
          >
            AI News
          </Link>

          <Link
            href="/community"
            className="transition hover:text-brand"
          >
            Community
          </Link>

        </nav>

      </div>

      {/* Copyright */}

      <div className="border-t border-zinc-200 px-6 py-6 text-center text-sm text-zinc-600">
        © 2026 AI Cheatbook. All rights reserved.
      </div>

    </footer>
  );
}