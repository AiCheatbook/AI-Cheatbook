"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CustomField } from "@/lib/cms/customFields";

type CustomFieldCardProps = {
  field: CustomField;
  onUpdate: (id: string, patch: Partial<CustomField>) => void;
  onDelete: (id: string) => void;
};

export default function CustomFieldCard({
  field,
  onUpdate,
  onDelete,
}: CustomFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none px-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        title="Drag to move or reorder"
      >
        ⠿
      </button>

      <input
        value={field.label}
        onChange={(e) => onUpdate(field.id, { label: e.target.value })}
        placeholder="Field label (e.g. Aspect Ratio)"
        className="w-40 shrink-0 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
      />

      <input
        value={field.value}
        onChange={(e) => onUpdate(field.id, { value: e.target.value })}
        placeholder="Value (e.g. 16:9)"
        className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
      />

      <button
        type="button"
        onClick={() => onDelete(field.id)}
        className="shrink-0 text-xs text-zinc-400 hover:text-red-500"
      >
        Delete
      </button>
    </div>
  );
}
