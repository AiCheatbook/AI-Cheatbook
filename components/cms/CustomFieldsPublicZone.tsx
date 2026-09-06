import { fieldsInZone, type CustomField, type CustomFieldZone } from "@/lib/cms/customFields";

export default function CustomFieldsPublicZone({
  fields,
  zone,
}: {
  fields: CustomField[];
  zone: CustomFieldZone;
}) {
  const zoneFields = fieldsInZone(fields, zone).filter(
    (f) => f.label.trim() && f.value.trim()
  );

  if (zoneFields.length === 0) return null;

  return (
    <div className="my-4 space-y-2">
      {zoneFields.map((f) => (
        <div
          key={f.id}
          className="flex flex-wrap items-baseline gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-zinc-900">
            {f.label}:
          </span>
          <span className="text-sm text-zinc-700">{f.value}</span>
        </div>
      ))}
    </div>
  );
}
