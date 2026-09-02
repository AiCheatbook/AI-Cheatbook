"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import NavbarSearch from "./NavbarSearch";

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
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">

        {/* Logo */}

        <Link
          href="/"
          onClick={handleLogoClick}
          className="text-xl font-bold text-zinc-900 transition hover:text-brand"
        >
          AI Cheatbook
        </Link>

        {/* Desktop Navigation */}

        <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">

          <Link
            href="/search"
            className="transition hover:text-brand"
          >
            AI Library
          </Link>

          <Link
            href="/news"
            className="transition hover:text-brand"
          >
            AI News
          </Link>

          <Link
            href="/learning"
            className="transition hover:text-brand"
          >
            Learning
          </Link>

          <Link
            href="/community"
            className="transition hover:text-brand"
          >
            Community
          </Link>

          <Link
            href="/discussions"
            className="transition hover:text-brand"
          >
            Discussions
          </Link>

          <Link
            href="/generator"
            className="transition hover:text-brand"
          >
            Prompt Generator
          </Link>

        </nav>

        {/* Desktop Actions */}

        <div className="hidden items-center gap-4 md:flex">

          <NavbarSearch />

          <Link
            href={loggedIn ? "/account" : "/login"}
            className="text-sm text-zinc-600 transition hover:text-zinc-900"
          >
            {loggedIn ? "My Account" : "Login"}
          </Link>

          <Link
            href="/submit/prompt"
            className="rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
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
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 text-zinc-600 transition hover:border-brand hover:text-zinc-900 md:hidden"
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
        <div className="border-t border-zinc-200 bg-white px-6 py-4 md:hidden">

          <div className="mb-3">
            <NavbarSearch />
          </div>

          <nav className="flex flex-col gap-2">

            <Link
              href="/search"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >              AI Cheatbook Library
            </Link>

            <Link
              href="/news"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >
              AI News
            </Link>

            <Link
              href="/learning"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >
              Learning
            </Link>

            <Link
              href="/generator"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >
              Generator
            </Link>

            <Link
              href="/community"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >
              Community
            </Link>

            <Link
              href="/discussions"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
            >
              Discussions
            </Link>

            <Link
              href={loggedIn ? "/account" : "/login"}
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-zinc-600 transition hover:bg-zinc-100 hover:text-brand"
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