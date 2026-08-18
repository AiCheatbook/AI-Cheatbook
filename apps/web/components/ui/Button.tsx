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
      "bg-orange-500 text-white hover:bg-orange-600",

    secondary:
      "border border-zinc-700 bg-transparent text-white hover:bg-zinc-800",
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