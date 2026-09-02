type ToolChipProps = {
  name: string;
};

export default function ToolChip({
  name,
}: ToolChipProps) {
  return (
    <button
      type="button"
      className="rounded-full border border-zinc-800 px-5 py-2 text-sm text-white transition hover:border-brand hover:text-brand"
    >
      {name}
    </button>
  );
}