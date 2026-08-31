"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabaseAuthClient.auth
      .getUser()
      .then(({ data }) =>
        setLoggedIn(Boolean(data.user))
      );

    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(Boolean(session?.user));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogoClick(
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
    closeMenu();

    // If already on homepage, scroll smoothly to the top
    if (window.location.pathname === "/") {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">

        {/* Logo */}

        <Link
          href="/"
          onClick={handleLogoClick}
          className="text-xl font-bold text-white transition hover:text-orange-500"
        >
          AI Cheatbook
        </Link>

        {/* Desktop Navigation */}

        <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">

          <Link
            href="/search"
            className="transition hover:text-orange-500"
          >
            AI Library
          </Link>

          <Link
            href="/news"
            className="transition hover:text-orange-500"
          >
            AI News
          </Link>

          <Link
            href="/learning"
            className="transition hover:text-orange-500"
          >
            Learning
          </Link>

          <Link
            href="/community"
            className="transition hover:text-orange-500"
          >
            Community
          </Link>

          <Link
            href="/discussions"
            className="transition hover:text-orange-500"
          >
            Discussions
          </Link>

          <Link
            href="/generator"
            className="transition hover:text-orange-500"
          >
            Prompt Generator
          </Link>

        </nav>

        {/* Desktop Actions */}

        <div className="hidden items-center gap-4 md:flex">

          <Link
            href={loggedIn ? "/account" : "/login"}
            className="text-sm text-zinc-300 transition hover:text-white"
          >
            {loggedIn ? "My Account" : "Login"}
          </Link>

          <Link
            href="/submit/prompt"
            className="rounded-xl bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Submit Prompt
          </Link>

        </div>

        {/* Mobile Menu Button */}

        <button
          type="button"
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300 transition hover:border-orange-500 hover:text-white md:hidden"
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

      </div>

      {/* Mobile Navigation */}

      {menuOpen && (
        <div className="border-t border-zinc-800 bg-black px-6 py-4 md:hidden">

          <nav className="flex flex-col gap-2">

            <Link
              href="/search"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              AI Cheatbook Library
            </Link>

            <Link
              href="/news"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              AI News
            </Link>

            <Link
              href="/learning"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              Learning
            </Link>

            <Link
              href="/generator"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              Generator
            </Link>

            <Link
              href="/community"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              Community
            </Link>

            <Link
              href="/discussions"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              Discussions
            </Link>

            <Link
              href={loggedIn ? "/account" : "/login"}
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-500"
            >
              {loggedIn ? "My Account" : "Login"}
            </Link>

            <Link
              href="/submit/prompt"
              onClick={closeMenu}
              className="mt-2 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Submit Prompt
            </Link>

          </nav>

        </div>
      )}

    </header>
  );
}