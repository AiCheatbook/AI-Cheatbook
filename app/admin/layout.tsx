"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import NavDropdown from "@/components/admin/NavDropdown";
import { useStaffRole } from "@/components/admin/useStaffRole";
import { isAdminOnlyPath, ROLE_LABELS } from "@/lib/auth/roles";

type NavItem = { href: string; label: string };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin } = useStaffRole();

  // Moderators don't see the admin-only pages (see lib/auth/roles.ts).
  function visible(items: NavItem[]) {
    return isAdmin
      ? items
      : items.filter((item) => !isAdminOnlyPath(item.href));
  }

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
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 text-zinc-900">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm text-zinc-500">
            AI Cheatbook Admin
            {role && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isAdmin
                    ? "bg-brand/10 text-brand-text"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {ROLE_LABELS[role] || role}
              </span>
            )}
          </span>

          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/admin"
              className={
                pathname === "/admin"
                  ? "text-brand-text"
                  : "text-zinc-500 hover:text-zinc-900"
              }
            >
              Dashboard
            </Link>

            <NavDropdown
              label="Content"
              pathname={pathname}
              items={visible([
                { href: "/admin/posts", label: "Posts" },
                { href: "/admin/news", label: "News" },
                { href: "/admin/learning-cards", label: "Learning Cards" },
                { href: "/admin/artwork", label: "Artwork" },
                { href: "/admin/top-ten", label: "Homepage Top 10" },
              ])}
            />

            <NavDropdown
              label="Prompt Library"
              pathname={pathname}
              items={visible([
                { href: "/admin/prompts", label: "Prompts" },
                { href: "/admin/prompts/taxonomy", label: "Taxonomy" },
                { href: "/admin/keywords", label: "Keyword Library" },
                { href: "/admin/structures", label: "Structures" },
              ])}
            />

            <NavDropdown
              label="Moderation"
              pathname={pathname}
              items={visible([
                { href: "/admin/submissions", label: "Submissions" },
                { href: "/admin/trending", label: "Trending" },
              ])}
            />

            <NavDropdown
              label="Admin"
              pathname={pathname}
              items={visible([
                { href: "/admin/users", label: "Users" },
                { href: "/admin/messages", label: "Messages" },
                { href: "/admin/audit-log", label: "Audit Log" },
                { href: "/admin/settings", label: "Site Settings" },
              ])}
            />
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md border border-zinc-200 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Log Out
        </button>
      </div>

      <div className="min-h-screen bg-white text-zinc-900">
        {children}
      </div>
    </div>
  );
}
