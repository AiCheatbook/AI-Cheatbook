export type CustomFieldZone =
  | "above_title"
  | "below_title"
  | "below_description"
  | "below_prompt"
  | "bottom";

export type CustomField = {
  id: string;
  label: string;
  value: string;
  zone: CustomFieldZone;
  sortOrder: number;
};

export const ZONES: { key: CustomFieldZone; label: string }[] = [
  { key: "above_title", label: "Above Title" },
  { key: "below_title", label: "Below Title" },
  { key: "below_description", label: "Below Description" },
  { key: "below_prompt", label: "Below Prompt Text" },
  { key: "bottom", label: "Bottom of Form" },
];

export function newCustomField(zone: CustomFieldZone, sortOrder: number): CustomField {
  return {
    id: crypto.randomUUID(),
    label: "",
    value: "",
    zone,
    sortOrder,
  };
}

export function fieldsInZone(
  fields: CustomField[],
  zone: CustomFieldZone
): CustomField[] {
  return fields
    .filter((f) => f.zone === zone)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
