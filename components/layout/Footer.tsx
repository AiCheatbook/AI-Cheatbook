import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black text-white">

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-center md:justify-between">

        {/* Brand */}

        <div>
          <Link
            href="/"
            className="text-2xl font-bold text-white transition hover:text-orange-500"
          >
            AI Cheatbook
          </Link>

          <p className="mt-2 max-w-sm text-zinc-400">
            Verified AI Prompts for Creators &
            Developers
          </p>
        </div>

        {/* Links */}

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">

          <Link
            href="/search"
            className="transition hover:text-orange-500"
          >
            Browse Prompts
          </Link>

          <Link
            href="/generator"
            className="transition hover:text-orange-500"
          >
            Generator
          </Link>

          <Link
            href="/news"
            className="transition hover:text-orange-500"
          >
            AI News
          </Link>

          <Link
            href="/"
            className="transition hover:text-orange-500"
          >
            Community
          </Link>

        </nav>

      </div>

      {/* Copyright */}

      <div className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-500">
        © 2026 AI Cheatbook. All rights reserved.
      </div>

    </footer>
  );
}