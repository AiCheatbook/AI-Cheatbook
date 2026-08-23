import type {
  AITool,
  GeneratorKeyword,
} from "./types";

import { aiToolConfigs } from "./aiToolConfig";

type BuildPromptOptions = {
  task: string;
  keywords: GeneratorKeyword[];
  aiTool: AITool;
};

export function buildPrompt({
  task,
  keywords,
  aiTool,
}: BuildPromptOptions): string {
  const cleanTask = task.trim();

  const config = aiToolConfigs[aiTool];

  const selectedKeywords = keywords
    .map((keyword) => {
      if (keyword.description) {
        return `${keyword.label}: ${keyword.description}`;
      }

      return keyword.label;
    })
    .join("\n");

  const keywordLabels = keywords
    .map((keyword) => keyword.label)
    .join(", ");

  const keywordInstructions = keywords
    .map((keyword) => {
      if (keyword.description) {
        return `- ${keyword.description}`;
      }

      return `- Apply ${keyword.label.toLowerCase()} naturally.`;
    })
    .join("\n");

  /*
   * IMAGE GENERATION
   */

  if (config.type === "image") {
    return `Create a detailed ${aiTool} image-generation prompt for:

${cleanTask || "the requested visual concept"}

Visual direction:
${keywordInstructions || "- Create a visually strong and detailed composition."}

Include:

- Main subject and important visual details
- Environment and background
- Composition and framing
- Camera perspective
- Lighting and atmosphere
- Color and mood
- Visual style

Keep the prompt specific, descriptive, and ready to paste directly into ${aiTool}.

Selected qualities:
${selectedKeywords || "None"}

Return only the final image-generation prompt.`;
  }

  /*
   * VIDEO GENERATION
   */

  if (config.type === "video") {
    return `Create a detailed ${aiTool} video-generation prompt for:

${cleanTask || "the requested video concept"}

Apply these creative qualities:
${keywordInstructions || "- Use clear visual storytelling and natural pacing."}

Include:

- Subject and scene description
- Character or subject actions
- Environment and important details
- Camera framing and movement
- Motion and pacing
- Lighting and atmosphere
- Cinematic visual style
- Visual continuity

Make the prompt specific and ready to paste directly into ${aiTool}.

Selected qualities:
${selectedKeywords || "None"}

Return only the final video-generation prompt.`;
  }

  /*
   * TEXT / GENERAL AI
   */

  return `Act as an expert ${aiTool} prompt writer.

Create a professional, ready-to-use prompt for the following goal:

${cleanTask || "the user's requested task"}

Apply these qualities:
${keywordInstructions || "- Make the response clear, useful, and engaging."}

The prompt should:

- Clearly define the task
- Preserve the user's original intent
- Include useful context
- Give precise instructions
- Use the selected qualities naturally
- Specify the desired output
- Avoid unnecessary complexity
- Be practical and ready to use

Selected qualities:
${keywordLabels || "None"}

Write the final prompt directly for the user to copy and paste into ${aiTool}.

Return only the final usable prompt.`;
}