type GenerateButtonProps = {
  disabled: boolean;
  onClick: () => void;
  loading?: boolean;
};

export default function GenerateButton({
  disabled,
  onClick,
  loading = false,
}: GenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full rounded-xl bg-brand px-6 py-4 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? "Generating..." : "Generate Prompt"}
    </button>
  );
}