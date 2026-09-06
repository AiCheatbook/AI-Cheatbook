"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import CustomFieldCard from "@/components/cms/CustomFieldCard";
import { ZONES, type CustomField, type CustomFieldZone } from "@/lib/cms/customFields";

type CustomFieldsDndContextProps = {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  children: React.ReactNode;
};

function isZoneKey(id: string): id is CustomFieldZone {
  return ZONES.some((z) => z.key === id);
}

/*
 * Wraps the whole Prompt form in one drag-and-drop surface so a
 * custom field can be dragged from any zone to any other — e.g.
 * from "Below Title" straight to "Below Prompt Text" — not just
 * reordered within a single fixed spot.
 */
export default function CustomFieldsDndContext({
  fields,
  onChange,
  children,
}: CustomFieldsDndContextProps) {
  const [activeField, setActiveField] = useState<CustomField | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const field = fields.find((f) => f.id === event.active.id);
    setActiveField(field || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeField = fields.find((f) => f.id === active.id);
    if (!activeField) return;

    const overId = String(over.id);
    const overZone: CustomFieldZone | undefined = isZoneKey(overId)
      ? overId
      : fields.find((f) => f.id === overId)?.zone;

    if (!overZone || overZone === activeField.zone) return;

    // Move the field into its new zone, appended at the end for
    // now — onDragEnd finalizes exact order once the drag settles.
    const maxOrderInNewZone = Math.max(
      -1,
      ...fields.filter((f) => f.zone === overZone).map((f) => f.sortOrder)
    );

    onChange(
      fields.map((f) =>
        f.id === activeField.id
          ? { ...f, zone: overZone, sortOrder: maxOrderInNewZone + 1 }
          : f
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveField(null);

    const { active, over } = event;
    if (!over) return;

    const activeF = fields.find((f) => f.id === active.id);
    if (!activeF) return;

    const overId = String(over.id);
    const overField = fields.find((f) => f.id === overId);

    // Dropped directly on another field in the same zone — swap
    // their relative order. (Cross-zone placement already
    // happened in onDragOver; this just fine-tunes position.)
    if (overField && overField.zone === activeF.zone && overField.id !== activeF.id) {
      const zoneFields = fields
        .filter((f) => f.zone === activeF.zone)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const fromIndex = zoneFields.findIndex((f) => f.id === activeF.id);
      const toIndex = zoneFields.findIndex((f) => f.id === overField.id);

      const reordered = [...zoneFields];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const renumbered = reordered.map((f, i) => ({ ...f, sortOrder: i }));

      onChange(
        fields.map((f) => renumbered.find((r) => r.id === f.id) || f)
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeField ? (
          <CustomFieldCard
            field={activeField}
            onUpdate={() => {}}
            onDelete={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
