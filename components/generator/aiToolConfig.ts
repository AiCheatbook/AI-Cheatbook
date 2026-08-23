import type { AITool } from "./types";

export type AIToolConfig = {
  name: AITool;
  type: "text" | "image" | "video";
  description: string;
  instructions: string[];
  outputFormat: string;
};

export const aiToolConfigs: Record<
  AITool,
  AIToolConfig
> = {
  ChatGPT: {
    name: "ChatGPT",
    type: "text",

    description:
      "Create clear, structured prompts for text generation and reasoning.",

    instructions: [
      "Clearly define the role of the AI.",
      "Provide useful context.",
      "Give precise instructions.",
      "Define the expected output.",
      "Use structured sections when useful.",
    ],

    outputFormat:
      "Return a polished, ready-to-use text prompt.",
  },

  Gemini: {
    name: "Gemini",
    type: "text",

    description:
      "Create detailed prompts for research, reasoning, writing and multimodal tasks.",

    instructions: [
      "Provide clear context.",
      "State the objective explicitly.",
      "Break complex tasks into logical steps.",
      "Specify the desired output.",
      "Include relevant constraints.",
    ],

    outputFormat:
      "Return a clear and detailed ready-to-use prompt.",
  },

  Claude: {
    name: "Claude",
    type: "text",

    description:
      "Create precise prompts for writing, analysis and complex instructions.",

    instructions: [
      "Define the task clearly.",
      "Provide sufficient context.",
      "Use explicit constraints.",
      "Explain the desired outcome.",
      "Prefer structured instructions.",
    ],

    outputFormat:
      "Return a precise, structured prompt ready to use.",
  },

  Midjourney: {
    name: "Midjourney",
    type: "image",

    description:
      "Create visual prompts focused on subject, composition, lighting and style.",

    instructions: [
      "Describe the main subject.",
      "Define the environment.",
      "Specify composition and camera perspective.",
      "Describe lighting and atmosphere.",
      "Define the visual style.",
    ],

    outputFormat:
      "Return a concise visual generation prompt.",
  },

  Flux: {
    name: "Flux",
    type: "image",

    description:
      "Create detailed image-generation prompts with strong visual descriptions.",

    instructions: [
      "Clearly describe the subject.",
      "Describe the environment.",
      "Specify composition.",
      "Define lighting and mood.",
      "Include important visual details.",
    ],

    outputFormat:
      "Return a detailed image-generation prompt.",
  },

  Runway: {
    name: "Runway",
    type: "video",

    description:
      "Create cinematic video prompts describing scenes, motion and camera movement.",

    instructions: [
      "Describe the scene.",
      "Define subject movement.",
      "Specify camera movement.",
      "Describe lighting and atmosphere.",
      "Maintain visual continuity.",
    ],

    outputFormat:
      "Return a cinematic video-generation prompt.",
  },

  Veo: {
    name: "Veo",
    type: "video",

    description:
      "Create detailed cinematic video prompts with subject, camera and motion instructions.",

    instructions: [
      "Describe the scene clearly.",
      "Define character or subject actions.",
      "Specify camera movement.",
      "Describe lighting and environment.",
      "Define the desired cinematic style.",
    ],

    outputFormat:
      "Return a detailed cinematic video prompt.",
  },
};