"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Role = "user" | "moderator" | "admin";

type UserRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: Role;
  is_disabled: boolean;
  created_at: string;
};

const ROLES: Role[] = ["user", "moderator", "admin"];

export default function AdminUsersPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabaseAuthClient
      .from("profiles")
      .select("id, display_name, email, role, is_disabled, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("AdminUsersPage: failed to load users:", error.message);
    }

    setUsers((data || []) as UserRow[]);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabaseAuthClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setMyUserId(user.id);
      setChecking(false);
      await loadUsers();
    }

    init();
  }, [router]);

  async function logAction(
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ) {
    const { error } = await supabaseAuthClient.from("audit_log").insert({
      actor_id: myUserId,
      action,
      target_type: "profiles",
      target_id: targetId,
      details,
    });

    if (error) {
      console.error("AdminUsersPage: failed to write audit log:", error.message);
    }
  }

  async function changeRole(u: UserRow, newRole: Role) {
    if (u.id === myUserId && newRole !== "admin") {
      alert("You can't remove your own admin role from here.");
      return;
    }

    setBusyId(u.id);

    const { error } = await supabaseAuthClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", u.id);

    if (error) {
      console.error("AdminUsersPage: failed to change role:", error.message);
      alert(`Couldn't change role: ${error.message}`);
    } else {
      await logAction("user_role_changed", u.id, {
        from: u.role,
        to: newRole,
        email: u.email,
      });
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, role: newRole } : row
        )
      );
    }

    setBusyId(null);
  }

  async function toggleDisabled(u: UserRow) {
    if (u.id === myUserId) {
      alert("You can't disable your own account from here.");
      return;
    }

    setBusyId(u.id);

    const nextValue = !u.is_disabled;

    const { error } = await supabaseAuthClient
      .from("profiles")
      .update({ is_disabled: nextValue })
      .eq("id", u.id);

    if (error) {
      console.error("AdminUsersPage: failed to update status:", error.message);
      alert(`Couldn't update status: ${error.message}`);
    } else {
      await logAction(
        nextValue ? "user_disabled" : "user_enabled",
        u.id,
        { email: u.email }
      );
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, is_disabled: nextValue } : row
        )
      );
    }

    setBusyId(null);
  }

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">User Management</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="w-64 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-brand"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Loading users...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No users match that search.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {u.display_name || "—"}
                      {u.id === myUserId && (
                        <span className="ml-2 text-xs text-brand-text">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) =>
                        changeRole(u, e.target.value as Role)
                      }
                      className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-white disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.is_disabled
                          ? "bg-red-500/10 text-red-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {u.is_disabled ? "Disabled" : "Active"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-neutral-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === u.id || u.id === myUserId}
                      onClick={() => toggleDisabled(u)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {u.is_disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Disabling a user currently blocks them from creating new posts and
        joining communities. It does not yet block commenting, voting, or
        other actions — see database/042_user_management.sql for the exact
        scope.
      </p>
    </div>
  );
}
