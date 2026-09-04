"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const VISITOR_ID_KEY = "aicheatbook_visitor_id";

function getOrCreateVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const fresh = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_ID_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back
    // to a per-load random id rather than crashing the tracker.
    return crypto.randomUUID();
  }
}

/*
 * Records one row per page visit into `page_views`
 * (database/044_page_views.sql). Skips /admin/* paths
 * so an admin browsing their own dashboard doesn't
 * inflate the numbers they're looking at.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (lastTracked.current === pathname) return;

    lastTracked.current = pathname;

    async function track() {
      const visitorId = getOrCreateVisitorId();

      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      const { error } = await supabase.from("page_views").insert({
        path: pathname,
        visitor_id: visitorId,
        user_id: user?.id || null,
      });

      if (error) {
        console.error("PageViewTracker: failed to record view:", error.message);
      }
    }

    track();
  }, [pathname]);

  return null;
}
