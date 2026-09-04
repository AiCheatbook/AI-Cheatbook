"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage =
    pathname === "/admin/login";

  async function handleLogout() {
    await supabaseAuthClient.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm text-neutral-400">
            AI Cheatbook Admin
          </span>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin"
              className={
                pathname === "/admin"
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Dashboard
            </Link>

            <Link
              href="/admin/news"
              className={
                pathname.startsWith(
                  "/admin/news"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              News
            </Link>

            <Link
              href="/admin/prompts"
              className={
                pathname.startsWith(
                  "/admin/prompts"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Prompt Library
            </Link>

            <Link
              href="/admin/learning-cards"
              className={
                pathname.startsWith(
                  "/admin/learning-cards"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Learning Cards
            </Link>

            <Link
              href="/admin/submissions"
              className={
                pathname.startsWith(
                  "/admin/submissions"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Submissions
            </Link>

            <Link
              href="/admin/community"
              className={
                pathname.startsWith(
                  "/admin/community"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Community
            </Link>

            <Link
              href="/admin/artwork"
              className={
                pathname.startsWith(
                  "/admin/artwork"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Artwork
            </Link>

            <Link
              href="/admin/users"
              className={
                pathname.startsWith(
                  "/admin/users"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Users
            </Link>

            <Link
              href="/admin/audit-log"
              className={
                pathname.startsWith(
                  "/admin/audit-log"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Audit Log
            </Link>

            <Link
              href="/admin/trending"
              className={
                pathname.startsWith(
                  "/admin/trending"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Trending
            </Link>

            <Link
              href="/admin/keywords"
              className={
                pathname.startsWith(
                  "/admin/keywords"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Keywords
            </Link>

            <Link
              href="/admin/structures"
              className={
                pathname.startsWith(
                  "/admin/structures"
                )
                  ? "text-brand-text"
                  : "text-neutral-400 hover:text-white"
              }
            >
              Structures
            </Link>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md border border-white/10 px-3 py-1 text-sm text-zinc-900 hover:bg-white/10"
        >
          Log Out
        </button>
      </div>

      {children}
    </div>
  );
}
