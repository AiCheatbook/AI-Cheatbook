type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

export default function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const baseStyle =
    "rounded-xl px-6 py-3 font-medium transition duration-200";

  const variants = {
    primary:
      "bg-brand text-zinc-900 hover:bg-brand-dark",

    secondary:
      "border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}