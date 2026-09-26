"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type WriteSomethingBoxProps = {
  onClick: () => void;
};

/*
 * Skool-style "Write something" prompt at the top of the feed.
 * Clicking it opens the PostComposer, which asks for the post
 * type first.
 */
export default function WriteSomethingBox({
  onClick,
}: WriteSomethingBoxProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) return;

      const { data } = await supabaseAuthClient
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      const name = data?.display_name || data?.email || user.email || "";

      setAvatarUrl(data?.avatar_url || null);
      setInitial(name ? name.charAt(0).toUpperCase() : null);
    }

    load();
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm transition hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-500">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : initial ? (
          <span className="font-bold text-brand-text">{initial}</span>
        ) : (
          <UserRound className="h-5 w-5" strokeWidth={1.75} />
        )}
      </span>
      <span className="text-lg text-zinc-400">Write something</span>
    </button>
  );
}
