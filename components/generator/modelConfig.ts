import type { AITool } from "./types";

export type UserPlan =
  | "free"
  | "paid";

export type ModelConfig = {
  id: string;
  name: string;
  provider: string;
  description: string;
  availableFor: UserPlan[];
  supportedTools: AITool[];
};

export const modelConfigs: ModelConfig[] = [
  {
    id: "free-default",
    name: "Free AI Model",
    provider: "local",
    description:
      "Default low-cost model for free users.",
    availableFor: ["free", "paid"],
    supportedTools: [
      "ChatGPT",
      "Gemini",
      "Claude",
      "Midjourney",
      "Flux",
      "Runway",
      "Veo",
    ],
  },

  {
    id: "advanced-default",
    name: "Advanced AI Model",
    provider: "advanced",
    description:
      "Higher-quality model reserved for advanced users.",
    availableFor: ["paid"],
    supportedTools: [
      "ChatGPT",
      "Gemini",
      "Claude",
      "Midjourney",
      "Flux",
      "Runway",
      "Veo",
    ],
  },
];