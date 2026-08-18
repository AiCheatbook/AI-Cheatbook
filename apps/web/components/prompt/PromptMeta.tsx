type PromptMetaProps = {
  aiTool: string;
  category: string;
  language?: string;
  rating: number;
  reviews: number;
};

export default function PromptMeta({
  aiTool,
  category,
  language = "English",
  rating,
  reviews,
}: PromptMetaProps) {
  return (
    <section className="mt-10">

      {/* Header */}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Prompt Information
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Details about this AI prompt.
        </p>
      </div>

      {/* Information Grid */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* AI Tool */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">
            AI Tool
          </p>

          <p className="mt-2 font-medium text-white">
            {aiTool}
          </p>
        </div>

        {/* Category */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">
            Category
          </p>

          <p className="mt-2 font-medium text-white">
            {category}
          </p>
        </div>

        {/* Language */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">
            Language
          </p>

          <p className="mt-2 font-medium text-white">
            {language}
          </p>
        </div>

        {/* Rating */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-500">
            Rating
          </p>

          <p className="mt-2 font-medium text-white">
            ⭐ {rating}{" "}
            <span className="text-zinc-500">
              ({reviews})
            </span>
          </p>
        </div>

      </div>

    </section>
  );
}