type ToolChipProps = {
  name: string;
};

export default function ToolChip({
  name,
}: ToolChipProps) {
  return (
    <button
      type="button"
      className="rounded-full border border-zinc-200 px-5 py-2 text-sm text-zinc-900 transition hover:border-brand hover:text-brand-text"
    >
      {name}
    </button>
  );
}