"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PromptStructureSpec } from "../aiProvider";

type StructurePopoverProps = {
  selected: PromptStructureSpec | null;
  onChange: (
    structure: PromptStructureSpec | null
  ) => void;
  isLoggedIn: boolean;
};

type StructureRow = {
  id: string;
  name: string;
  fields: string[];
};

export default function StructurePopover({
  selected,
  onChange,
  isLoggedIn,
}: StructurePopoverProps) {
  const [open, setOpen] = useState(false);
  const [structures, setStructures] =
    useState<StructureRow[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("prompt_structures")
        .select("id, name, fields")
        .order("sort_order", {
          ascending: true,
        });

      setStructures(
        (data || []) as StructureRow[]
      );
    }

    load();
  }, []);

  if (!isLoggedIn) {
    return (
      <div
        title="Log in to use Prompt Structures"
        className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600"
      >
        🔒 Structure
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-3 py-1.5 text-xs transition ${
          selected
            ? "border-orange-500 bg-orange-500/10 text-orange-400"
            : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
        }`}
      >
        {selected
          ? selected.name
          : "Structure ▾"}
      </button>

      {open && (
        <div className="absolute bottom-9 left-0 z-30 w-52 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-800"
          >
            None
          </button>

          {structures.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange({
                  name: s.name,
                  fields: s.fields,
                });
                setOpen(false);
              }}
              className="block w-full border-t border-zinc-800 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
