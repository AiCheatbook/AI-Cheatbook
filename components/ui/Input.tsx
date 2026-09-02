type InputProps = {
  placeholder: string;
};

export default function Input({ placeholder }: InputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-zinc-900 placeholder:text-zinc-600 outline-none transition focus:border-brand"
    />
  );
}