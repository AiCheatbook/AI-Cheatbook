"use client";

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
        <span className="text-sm text-neutral-400">
          AI Cheatbook Admin
        </span>

        <button
          onClick={handleLogout}
          className="rounded-md border border-white/10 px-3 py-1 text-sm text-white hover:bg-white/10"
        >
          Log Out
        </button>
      </div>

      {children}
    </div>
  );
}
