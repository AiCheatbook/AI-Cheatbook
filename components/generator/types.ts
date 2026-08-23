export type GeneratorKeyword = {
  id: string;
  label: string;
  category: string;
  description?: string;
};

export type GeneratorGroup = {
  category: string;
  keywords: GeneratorKeyword[];
};

export type AITool =
  | "ChatGPT"
  | "Gemini"
  | "Claude"
  | "Midjourney"
  | "Flux"
  | "Runway"
  | "Veo";