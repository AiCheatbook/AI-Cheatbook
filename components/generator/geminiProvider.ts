import type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  AttachmentRole,
} from "./aiProvider";

import { buildPrompt } from "./promptBuilder";
import { localProvider } from "./aiProvider";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/*
 * Real AI pipeline:
 *
 * 1. Understand intent — build one clear
 *    instruction that labels what each
 *    input actually means (the sentence
 *    itself, which keywords are
 *    camera/shot instructions vs overall
 *    style qualities, and what each
 *    attached image represents).
 * 2. Generate the base, natural-language
 *    professional prompt.
 * 3. If a Prompt Structure was chosen
 *    (registered users only), take that
 *    finished prompt and REWRITE it into
 *    the structure's fields — a second
 *    pass, not a template fill-in.
 *
 * Falls back to the local generator at
 * any point something goes wrong, so the
 * feature never fully breaks.
 */

const GEMINI_MODEL = "gemini-3.6-flash";

const ATTACHMENT_ROLE_LABELS: Record<
  AttachmentRole,
  string
> = {
  character: "the character/subject",
  face: "the face/appearance",
  clothing: "the clothing/outfit",
  pose: "the pose",
  environment:
    "the environment/setting",
  product: "the product",
  composition: "the composition/framing",
  style: "the visual style",
  lighting: "the lighting",
  other: "a general visual reference",
};

function buildIntentInstruction(
  request: AIProviderRequest
): string {
  const lines: string[] = [];

  lines.push(
    `Act as an expert ${request.aiTool} prompt writer.`
  );

  lines.push(
    `\nThe person's idea, in their own words:\n"${request.task}"`
  );

  const inlineKeywords =
    request.inlineKeywords || [];
  const globalKeywords =
    request.globalKeywords || [];

  if (inlineKeywords.length > 0) {
    lines.push(
      `\nThe following are specific camera, shot, or action instructions the person chose — weave each one precisely into how the subject/action is depicted, don't just mention it in passing:\n${inlineKeywords
        .map((k) => `- ${k}`)
        .join("\n")}`
    );
  }

  if (globalKeywords.length > 0) {
    lines.push(
      `\nThe following describe the overall look, mood, or style the person wants — blend these naturally into the prose as qualities of the whole scene, never as a bolted-on list at the end:\n${globalKeywords
        .map((k) => `- ${k}`)
        .join("\n")}`
    );
  }

  const attachments =
    request.attachments || [];

  if (attachments.length > 0) {
    lines.push(
      `\n${attachments.length} reference image(s) are attached. Each one represents a specific aspect — use it for exactly that aspect, don't redescribe details already visible in it:\n${attachments
        .map(
          (a, i) =>
            `- Image ${i + 1}: reference for ${ATTACHMENT_ROLE_LABELS[a.role]}`
        )
        .join("\n")}`
    );
  } else if (
    request.referenceImageMode ===
    "one-later"
  ) {
    lines.push(
      `\nNo image is attached yet, but the person WILL provide one reference image to the target AI when they actually use this prompt. Write the prompt assuming a reference image will be present — focus on camera movement, motion, and atmosphere rather than describing static visual details a reference image would already show.`
    );
  } else if (
    request.referenceImageMode ===
    "multiple-later"
  ) {
    lines.push(
      `\nNo image is attached yet, but the person WILL provide multiple reference images to the target AI when they actually use this prompt (e.g. for character or style consistency across shots). Write the prompt assuming those references will be present.`
    );
  }

  lines.push(
    `\nWrite ONE cohesive, professional, ready-to-use prompt in natural sentence form — not a list of keywords, not labeled fields. Write only the final prompt itself, no explanation or preamble.`
  );

  return lines.join("\n");
}

function buildStructureInstruction(
  basePrompt: string,
  structureName: string,
  fields: string[]
): string {
  return `Rewrite the following prompt into this structure, reorganizing its existing content into each field — do not invent new content, and do not lose any detail from the original:

Structure: ${structureName}
Fields: ${fields.join(", ")}

Original prompt:
"${basePrompt}"

Output the rewritten prompt with each field clearly labeled (e.g. "Role: ...", "Task: ..."), one per line, in the order given above. Output only the rewritten prompt, no explanation.`;
}

async function callGemini(
  ai: InstanceType<typeof GoogleGenAI>,
  instruction: string,
  attachments?: {
    base64: string;
    mimeType: string;
  }[]
): Promise<string | undefined> {
  const contents =
    attachments && attachments.length > 0
      ? [
          {
            role: "user" as const,
            parts: [
              ...attachments.map(
                (a) => ({
                  inlineData: {
                    mimeType: a.mimeType,
                    data: a.base64,
                  },
                })
              ),
              { text: instruction },
            ],
          },
        ]
      : instruction;

  const response =
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.8,
        maxOutputTokens: 2048,

        /*
         * Gemini's Flash models run
         * invisible internal "thinking"
         * by default, and that thinking
         * draws from the SAME token
         * budget as maxOutputTokens —
         * this is why raising the limit
         * alone didn't fully fix
         * truncation: most of the budget
         * was being spent on reasoning
         * you never see, not on the
         * actual prompt text. Turning
         * thinking off dedicates the
         * full budget to real output,
         * which is all this task needs.
         */

        /*
         * Gemini 3.x models (including
         * 3.6 Flash) use a different
         * config than older Gemini 2.5
         * models — "thinkingLevel" (a
         * word), not "thinkingBudget"
         * (a number). Sending the old
         * parameter causes a 400 error
         * on this model generation. This
         * model also can't fully turn
         * thinking off, so "low" is the
         * lowest safe setting — it still
         * reduces how much of the token
         * budget goes to invisible
         * reasoning instead of the
         * actual prompt text.
         */

        thinkingConfig: {
          thinkingLevel:
            ThinkingLevel.LOW,
        },
      },
    });

  const finishReason =
    response.candidates?.[0]
      ?.finishReason;

  if (finishReason === "MAX_TOKENS") {
    console.error(
      "Gemini response was cut off by the token limit — the returned text may be incomplete."
    );
  }

  return response.text;
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  async generate(
    request: AIProviderRequest
  ): Promise<AIProviderResponse> {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not set — falling back to local generation."
      );

      return localProvider.generate(
        request
      );
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
      });

      // Legacy single-image path (still
      // supported for the older
      // "upload now" reference mode).

      const legacyAttachment =
        request.referenceImageMode ===
          "upload" &&
        request.referenceImageBase64 &&
        request.referenceImageMimeType
          ? [
              {
                base64:
                  request.referenceImageBase64,
                mimeType:
                  request.referenceImageMimeType,
              },
            ]
          : undefined;

      const attachmentsForCall =
        request.attachments &&
        request.attachments.length > 0
          ? request.attachments.map(
              (a) => ({
                base64: a.base64,
                mimeType: a.mimeType,
              })
            )
          : legacyAttachment;

      const intentInstruction =
        buildIntentInstruction(request);

      const basePrompt = await callGemini(
        ai,
        intentInstruction,
        attachmentsForCall
      );

      if (
        !basePrompt ||
        !basePrompt.trim()
      ) {
        console.error(
          "Gemini returned an empty response — falling back to local generation."
        );

        return localProvider.generate(
          request
        );
      }

      /*
       * Prompt Structure is a
       * registered-users-only, second
       * transformation pass — never
       * trusted from the request alone,
       * always gated by isLoggedIn which
       * the API route sets server-side.
       */

      if (
        request.structure &&
        request.isLoggedIn
      ) {
        const structureInstruction =
          buildStructureInstruction(
            basePrompt.trim(),
            request.structure.name,
            request.structure.fields
          );

        const restructured =
          await callGemini(
            ai,
            structureInstruction
          );

        if (
          restructured &&
          restructured.trim()
        ) {
          return {
            prompt:
              restructured.trim(),
            provider: "gemini",
            model: GEMINI_MODEL,
          };
        }

        // If the restructure pass
        // fails, the base prompt is
        // still a perfectly good
        // result — return that rather
        // than losing everything.
      }

      return {
        prompt: basePrompt.trim(),
        provider: "gemini",
        model: GEMINI_MODEL,
      };
    } catch (error) {
      console.error(
        "Gemini request failed:",
        error
      );

      return localProvider.generate(
        request
      );
    }
  },
};
