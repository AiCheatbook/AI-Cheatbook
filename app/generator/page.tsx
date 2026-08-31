import PromptComposer from "@/components/generator/PromptComposer";

export default function GeneratorPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <PromptComposer />
    </main>
  );
}