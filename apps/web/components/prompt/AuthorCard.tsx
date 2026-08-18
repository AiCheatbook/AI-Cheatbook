type AuthorCardProps = {
  name: string;
  verified: boolean;
};

export default function AuthorCard({
  name,
  verified,
}: AuthorCardProps) {
  return (
    <section className="mt-10">

      {/* Header */}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Author
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Prompt created and verified by the community.
        </p>
      </div>

      {/* Author */}

      <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

        {/* Avatar */}

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-500 text-2xl font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Information */}

        <div>
          <h3 className="text-xl font-semibold text-white">
            {name}
          </h3>

          <p className="mt-1 text-sm text-zinc-400">
            {verified
              ? "✓ Verified Creator"
              : "Community Creator"}
          </p>
        </div>

      </div>

    </section>
  );
}