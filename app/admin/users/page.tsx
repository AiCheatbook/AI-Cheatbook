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
  // Role picked in the dropdown but not saved yet, per user.
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

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

  function clearPending(userId: string) {
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function changeRole(u: UserRow, newRole: Role) {
    if (u.id === myUserId && newRole !== "admin") {
      alert("You can't remove your own admin role from here.");
      clearPending(u.id);
      return;
    }

    setBusyId(u.id);

    // .select() returns the updated rows, so a change the database
    // silently refused (no permission) shows up as zero rows.
    const { data: updated, error } = await supabaseAuthClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", u.id)
      .select("id");

    if (error || !updated?.length) {
      const reason = error?.message || "the database didn't allow the change";
      console.error("AdminUsersPage: failed to change role:", reason);
      alert(
        `Couldn't change role: ${reason}.\n\nRun database/062_moderator_role.sql in the Supabase SQL Editor once, then try again.`
      );
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
      clearPending(u.id);
      setSavedId(u.id);
      setTimeout(
        () => setSavedId((current) => (current === u.id ? null : current)),
        2500
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

    const { data: updated, error } = await supabaseAuthClient
      .from("profiles")
      .update({ is_disabled: nextValue })
      .eq("id", u.id)
      .select("id");

    if (error || !updated?.length) {
      const reason = error?.message || "the database didn't allow the change";
      console.error("AdminUsersPage: failed to update status:", reason);
      alert(
        `Couldn't update status: ${reason}.\n\nRun database/062_moderator_role.sql in the Supabase SQL Editor once, then try again.`
      );
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
      <div className="p-8 text-sm text-zinc-500">Checking access...</div>
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
          <h1 className="text-xl font-semibold text-zinc-900">User Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">
            <strong className="text-zinc-700">User</strong>: uses the site.{" "}
            <strong className="text-zinc-700">Moderator</strong>: logs in at
            /admin/login and creates or edits content like an admin, but can&apos;t
            delete anything or open Site Settings, Top 10, Users or the Audit
            Log. <strong className="text-zinc-700">Admin</strong>: everything.
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="w-64 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
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
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  Loading users...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No users match that search.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {u.display_name || "—"}
                      {u.id === myUserId && (
                        <span className="ml-2 text-xs text-brand-text">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">{u.email}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={pendingRoles[u.id] ?? u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => {
                          const value = e.target.value as Role;
                          setSavedId(null);
                          if (value === u.role) {
                            clearPending(u.id);
                          } else {
                            setPendingRoles((prev) => ({ ...prev, [u.id]: value }));
                          }
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      {pendingRoles[u.id] && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => changeRole(u, pendingRoles[u.id])}
                            className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                          >
                            {busyId === u.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => clearPending(u.id)}
                            className="text-xs text-zinc-500 hover:text-zinc-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {savedId === u.id && (
                        <span className="text-xs font-semibold text-green-600">
                          Saved ✓
                        </span>
                      )}
                    </div>
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

                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === u.id || u.id === myUserId}
                      onClick={() => toggleDisabled(u)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {u.is_disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Disabling a user currently blocks them from creating new posts and
        joining communities. It does not yet block commenting, voting, or
        other actions — see database/042_user_management.sql for the exact
        scope.
      </p>
    </div>
  );
}
