"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() -
      new Date(dateString).getTime()) /
      1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  reply: "💬",
  answer_accepted: "✓",
  featured_in_library: "⭐",
};

export default function NotificationBell() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationRow[]>([]);
  const [loading, setLoading] =
    useState(true);

  const containerRef =
    useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const { data } = await supabaseAuthClient
      .from("notifications")
      .select(
        "id, type, message, link, is_read, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    setNotifications(
      (data ||
        []) as NotificationRow[]
    );
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(
      loadNotifications,
      60000
    );

    return () =>
      window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  async function handleNotificationClick(
    notification: NotificationRow
  ) {
    setOpen(false);

    if (!notification.is_read) {
      await supabaseAuthClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setNotifications((current) =>
        current.map((n) =>
          n.id === notification.id
            ? { ...n, is_read: true }
            : n
        )
      );
    }
  }

  async function handleMarkAllRead() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    await supabaseAuthClient
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((current) =>
      current.map((n) => ({
        ...n,
        is_read: true,
      }))
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const unreadCount = notifications.filter(
    (n) => !n.is_read
  ).length;

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-brand hover:text-brand"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">
              Notifications
            </p>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={
                  handleMarkAllRead
                }
                className="text-xs text-brand hover:text-brand-dark"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">
                Loading...
              </p>
            )}

            {!loading &&
              notifications.length ===
                0 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">
                  No notifications yet.
                </p>
              )}

            {!loading &&
              notifications.map(
                (notification) => (
                  <Link
                    key={notification.id}
                    href={
                      notification.link
                    }
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`flex items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-brand-light ${
                      notification.is_read
                        ? ""
                        : "bg-brand-light/40"
                    }`}
                  >
                    <span className="mt-0.5 text-lg">
                      {TYPE_ICON[
                        notification
                          .type
                      ] || "🔔"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-900">
                        {
                          notification.message
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {timeAgo(
                          notification.created_at
                        )}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </Link>
                )
              )}
          </div>
        </div>
      )}
    </div>
  );
}
