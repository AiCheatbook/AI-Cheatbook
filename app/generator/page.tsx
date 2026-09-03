import PromptComposer from "@/components/generator/PromptComposer";

export default function GeneratorPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 text-zinc-900 sm:px-6 lg:px-8">
      <PromptComposer />
    </main>
  );
}