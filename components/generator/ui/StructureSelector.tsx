"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PromptStructure = {
  id: string;
  name: string;
  description: string | null;
  fields: string[];
};

type StructureSelectorProps = {
  selectedId: string | null;
  onChange: (
    structure: PromptStructure | null
  ) => void;
};

export default function StructureSelector({
  selectedId,
  onChange,
}: StructureSelectorProps) {
  const [structures, setStructures] =
    useState<PromptStructure[]>([]);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("prompt_structures")
        .select("*")
        .order("sort_order", {
          ascending: true,
        });

      setStructures(
        (data ||
          []) as PromptStructure[]
      );
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-800" />
    );
  }

  if (structures.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full border px-4 py-2 text-sm transition ${
          !selectedId
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-zinc-700 bg-black text-zinc-300 hover:border-orange-500 hover:text-orange-400"
        }`}
      >
        No structure
      </button>

      {structures.map((structure) => (
        <button
          key={structure.id}
          type="button"
          title={structure.fields.join(
            " → "
          )}
          onClick={() =>
            onChange(
              selectedId === structure.id
                ? null
                : structure
            )
          }
          className={`rounded-full border px-4 py-2 text-sm transition ${
            selectedId === structure.id
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-zinc-700 bg-black text-zinc-300 hover:border-orange-500 hover:text-orange-400"
          }`}
        >
          {structure.name}
        </button>
      ))}
    </div>
  );
}
