"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import NavDropdown from "@/components/admin/NavDropdown";

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
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-950 px-6 py-3 text-white">
        <div className="flex items-center gap-6">
          <span className="text-sm text-neutral-400">
            AI Cheatbook Admin
          </span>

          <nav className="flex items-center gap-5 text-sm">
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

            <NavDropdown
              label="Content"
              pathname={pathname}
              items={[
                { href: "/admin/posts", label: "Posts" },
                { href: "/admin/news", label: "News" },
                { href: "/admin/learning-cards", label: "Learning Cards" },
                { href: "/admin/artwork", label: "Artwork" },
              ]}
            />

            <NavDropdown
              label="Prompt Library"
              pathname={pathname}
              items={[
                { href: "/admin/prompts", label: "Prompts" },
                { href: "/admin/prompts/taxonomy", label: "Taxonomy" },
                { href: "/admin/keywords", label: "Keyword Library" },
                { href: "/admin/structures", label: "Structures" },
              ]}
            />

            <NavDropdown
              label="Moderation"
              pathname={pathname}
              items={[
                { href: "/admin/submissions", label: "Submissions" },
                { href: "/admin/trending", label: "Trending" },
              ]}
            />

            <NavDropdown
              label="Admin"
              pathname={pathname}
              items={[
                { href: "/admin/users", label: "Users" },
                { href: "/admin/audit-log", label: "Audit Log" },
              ]}
            />
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md border border-white/10 px-3 py-1 text-sm text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          Log Out
        </button>
      </div>

      <div className="min-h-screen bg-neutral-950 text-white">
        {children}
      </div>
    </div>
  );
}
