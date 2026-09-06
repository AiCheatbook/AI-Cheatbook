"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CustomFieldCard from "@/components/cms/CustomFieldCard";
import {
  type CustomField,
  type CustomFieldZone,
  fieldsInZone,
} from "@/lib/cms/customFields";

type CustomFieldsZoneProps = {
  zone: CustomFieldZone;
  label: string;
  allFields: CustomField[];
  onUpdate: (id: string, patch: Partial<CustomField>) => void;
  onDelete: (id: string) => void;
};

export default function CustomFieldsZoneView({
  zone,
  label,
  allFields,
  onUpdate,
  onDelete,
}: CustomFieldsZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone });
  const zoneFields = fieldsInZone(allFields, zone);

  return (
    <div
      ref={setNodeRef}
      className={`my-2 rounded-xl border border-dashed p-2 transition ${
        isOver
          ? "border-brand bg-brand/5"
          : zoneFields.length > 0
            ? "border-zinc-200"
            : "border-zinc-100"
      }`}
    >
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
        {zoneFields.length === 0 && " (drag a custom field here)"}
      </p>

      <SortableContext
        items={zoneFields.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {zoneFields.map((field) => (
            <CustomFieldCard
              key={field.id}
              field={field}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
