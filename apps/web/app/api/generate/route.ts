import { NextResponse } from "next/server";

import { getAIProvider } from "@/components/generator/aiProvider";

import type { AITool } from "@/components/generator/types";
import type { UserPlan } from "@/components/generator/modelConfig";

type GenerateRequest = {
  task: string;
  keywords: string[];
  aiTool: AITool;
  plan?: UserPlan;
};

const AI_TOOLS: AITool[] = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

const PLANS: UserPlan[] = [
  "free",
  "paid",
];

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as GenerateRequest;

    const {
      task,
      keywords,
      aiTool,
      plan = "free",
    } = body;

    // Validate task

    if (
      typeof task !== "string" ||
      !task.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Task is required.",
        },
        { status: 400 }
      );
    }

    // Validate keywords

    if (
      !Array.isArray(keywords) ||
      keywords.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one keyword is required.",
        },
        { status: 400 }
      );
    }

    // Validate keyword values

    const validKeywords = keywords.filter(
      (keyword) =>
        typeof keyword === "string" &&
        keyword.trim().length > 0
    );

    if (validKeywords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one valid keyword is required.",
        },
        { status: 400 }
      );
    }

    // Validate AI tool

    if (!AI_TOOLS.includes(aiTool)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid AI tool selected.",
        },
        { status: 400 }
      );
    }

    // Validate plan

    if (!PLANS.includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user plan.",
        },
        { status: 400 }
      );
    }

    /*
     * Convert keyword labels into the
     * structure expected by the provider.
     */

    const generatorKeywords =
      validKeywords.map(
        (keyword, index) => ({
          id: `keyword-${index}`,
          label: keyword.trim(),
          category: "User Selected",
        })
      );

    // Select provider based on plan

    const provider =
      getAIProvider(plan);

    // Generate prompt

    const response =
      await provider.generate({
        task: task.trim(),
        keywords: generatorKeywords,
        aiTool,
        plan,
      });

    // Validate provider response

    if (
      !response ||
      typeof response.prompt !== "string" ||
      !response.prompt.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI provider returned an empty prompt.",
        },
        { status: 500 }
      );
    }

    // Return generated prompt

    return NextResponse.json({
      success: true,
      prompt: response.prompt,
      provider: response.provider,
      model: response.model,
    });
  } catch (error) {
    console.error(
      "Prompt generation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}