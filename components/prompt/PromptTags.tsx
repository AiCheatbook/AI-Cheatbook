type PromptTagsProps = {
  tags: string[];
};

export default function PromptTags({
  tags,
}: PromptTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border border-zinc-800 bg-black p-6 sm:p-8">

      {/* Header */}

      <h2 className="text-xl font-semibold text-white">
        Tags
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Topics and keywords related to this prompt.
      </p>

      {/* Tags */}

      <div className="mt-5 flex flex-wrap gap-3">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-brand hover:text-brand"
          >
            {tag}
          </span>
        ))}
      </div>

    </section>
  );
}