import Generator from "@/components/generator/Generator";

export default function GeneratorPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Generator />
      </div>
    </main>
  );
}