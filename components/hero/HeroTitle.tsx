import Badge from "../ui/Badge";

export default function HeroTitle() {
  return (
    <div className="flex flex-col items-center text-center">

      {/* Badge */}

      <Badge>
        Community Verified AI Prompts
      </Badge>

      {/* Main Title */}

      <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
        AI Cheatbook
      </h1>

      {/* Tagline */}

      <p className="mt-5 max-w-2xl text-lg text-zinc-600 sm:text-xl md:text-2xl">
        Verified AI Prompts That Actually Work
      </p>

      {/* Supporting Text */}

      <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
        Discover powerful prompts for ChatGPT, Gemini,
        Claude, Midjourney, Veo and more.
      </p>

    </div>
  );
}