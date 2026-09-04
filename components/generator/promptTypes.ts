import type { AITool } from "./types";

export type PromptType = {
  value: string;
  label: string;
  aiTool: AITool;
};

export const PROMPT_TYPES: PromptType[] = [
  {
    value: "image",
    label: "Image Generation",
    aiTool: "Midjourney",
  },
  {
    value: "video",
    label: "Video Generation",
    aiTool: "Veo",
  },
  {
    value: "writing",
    label: "Writing",
    aiTool: "ChatGPT",
  },
  {
    value: "code",
    label: "Coding",
    aiTool: "ChatGPT",
  },
  {
    value: "marketing",
    label: "Marketing",
    aiTool: "ChatGPT",
  },
];
