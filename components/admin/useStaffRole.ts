"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { isAdminRole, type Role } from "@/lib/auth/roles";

// One lookup per page load, shared by every component that asks.
let rolePromise: Promise<Role | null> | null = null;

function loadRole(): Promise<Role | null> {
  if (!rolePromise) {
    rolePromise = (async () => {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) return null;

      const { data } = await supabaseAuthClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      return (data?.role as Role) ?? null;
    })();
  }
  return rolePromise;
}

/*
 * The signed-in person's role in the admin area. canDelete is
 * false for moderators (and while loading), so delete buttons stay
 * hidden until we know the user is an admin.
 */
export function useStaffRole() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRole().then((value) => {
      if (!cancelled) setRole(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    role,
    isAdmin: isAdminRole(role),
    canDelete: isAdminRole(role),
  };
}
