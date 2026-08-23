type InputProps = {
  placeholder: string;
};

export default function Input({ placeholder }: InputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-orange-500"
    />
  );
}