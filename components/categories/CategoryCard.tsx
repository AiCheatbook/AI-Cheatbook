type CategoryCardProps = {
  icon: string;
  title: string;
};

export default function CategoryCard({
  icon,
  title,
}: CategoryCardProps) {
  return (
    <button className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-brand hover:-translate-y-1">
      <div className="text-4xl">{icon}</div>

      <h3 className="mt-4 text-lg font-semibold text-white">
        {title}
      </h3>
    </button>
  );
}