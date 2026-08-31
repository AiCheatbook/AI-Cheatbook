import { NextResponse } from "next/server";

import {
  getAIProvider,
  localProvider,
} from "@/components/generator/aiProvider";
import { createClient } from "@/lib/supabase/server";

import type { AITool } from "@/components/generator/types";
import type { UserPlan } from "@/components/generator/modelConfig";
import type {
  ReferenceImageMode,
  AttachmentRole,
  ReferenceAttachment,
  PromptStructureSpec,
} from "@/components/generator/aiProvider";

const REGISTERED_DAILY_LIMIT = 50;

type IncomingAttachment = {
  base64: string;
  mimeType: string;
  role: AttachmentRole;
};

type GenerateRequest = {
  task: string;
  keywords?: string[];
  inlineKeywords?: string[];
  globalKeywords?: string[];
  aiTool: AITool;
  plan?: UserPlan;
  mode?: "builtin" | "real-ai";
  attachments?: IncomingAttachment[];
  structure?: PromptStructureSpec | null;
  referenceImageMode?: ReferenceImageMode;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
};

// Roughly 4MB of actual image data once
// decoded from base64 per image.

const MAX_IMAGE_BASE64_LENGTH = 6_000_000;

const MAX_ATTACHMENTS = 5;

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ATTACHMENT_ROLES: AttachmentRole[] =
  [
    "character",
    "face",
    "clothing",
    "pose",
    "environment",
    "product",
    "composition",
    "style",
    "lighting",
    "other",
  ];

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

function validateAttachments(
  attachments: IncomingAttachment[] | undefined
): {
  valid?: ReferenceAttachment[];
  error?: string;
} {
  if (!attachments || attachments.length === 0) {
    return { valid: [] };
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    return {
      error: `Please attach at most ${MAX_ATTACHMENTS} images.`,
    };
  }

  const valid: ReferenceAttachment[] = [];

  for (const attachment of attachments) {
    if (
      !attachment.base64 ||
      !attachment.mimeType
    ) {
      continue;
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        attachment.mimeType
      )
    ) {
      return {
        error:
          "Unsupported image type. Please use JPEG, PNG, or WebP.",
      };
    }

    if (
      attachment.base64.length >
      MAX_IMAGE_BASE64_LENGTH
    ) {
      return {
        error:
          "One of your images is too large. Please use images under 4MB.",
      };
    }

    const role = ATTACHMENT_ROLES.includes(
      attachment.role
    )
      ? attachment.role
      : "other";

    valid.push({
      base64: attachment.base64,
      mimeType: attachment.mimeType,
      role,
    });
  }

  return { valid };
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as GenerateRequest;

    const {
      task,
      keywords = [],
      inlineKeywords = [],
      globalKeywords = [],
      aiTool,
      plan = "free",
      mode = "real-ai",
      attachments,
      structure,
      referenceImageMode = "none",
      referenceImageBase64,
      referenceImageMimeType,
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

    // Validate attachments

    const { valid: safeAttachments, error: attachmentError } =
      validateAttachments(attachments);

    if (attachmentError) {
      return NextResponse.json(
        {
          success: false,
          error: attachmentError,
        },
        { status: 400 }
      );
    }

    // Validate single-image legacy
    // reference (still supported)

    let safeReferenceImageBase64:
      | string
      | undefined;
    let safeReferenceImageMimeType:
      | string
      | undefined;

    if (
      referenceImageMode === "upload" &&
      referenceImageBase64 &&
      referenceImageMimeType
    ) {
      if (
        !ALLOWED_IMAGE_MIME_TYPES.includes(
          referenceImageMimeType
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unsupported image type. Please use JPEG, PNG, or WebP.",
          },
          { status: 400 }
        );
      }

      if (
        referenceImageBase64.length >
        MAX_IMAGE_BASE64_LENGTH
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Reference image is too large. Please use an image under 4MB.",
          },
          { status: 400 }
        );
      }

      safeReferenceImageBase64 =
        referenceImageBase64;
      safeReferenceImageMimeType =
        referenceImageMimeType;
    }

    /*
     * Convert flat keyword labels (legacy
     * shape) into the structure the local
     * fallback provider expects.
     */

    const generatorKeywords = keywords
      .filter(
        (k) =>
          typeof k === "string" &&
          k.trim().length > 0
      )
      .map((keyword, index) => ({
        id: `keyword-${index}`,
        label: keyword.trim(),
        category: "User Selected",
      }));

    /*
     * =====================================================
     * REAL AI USAGE LIMIT + LOGIN STATE
     * =====================================================
     *
     * Who the user actually is comes from
     * their real login session, checked
     * here on the server — never trusted
     * from the request body. This is also
     * what gates Prompt Structure (a
     * registered-users-only feature) — a
     * client claiming isLoggedIn:true in
     * the request is ignored entirely.
     */

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoggedIn = Boolean(user);

    let provider =
      mode === "builtin"
        ? localProvider
        : getAIProvider(plan);

    /*
     * Built-in mode never touches Real AI
     * at all — no Gemini attempt, and no
     * usage consumed, per spec: "Built-in
     * generation does not consume the
     * Real AI quota."
     */

    if (user && mode !== "builtin") {
      const { data: usageResult } =
        await supabase.rpc(
          "increment_real_ai_usage",
          {
            daily_limit:
              REGISTERED_DAILY_LIMIT,
          }
        );

      const allowed =
        (
          usageResult as {
            allowed?: boolean;
          } | null
        )?.allowed === true;

      if (!allowed) {
        provider = localProvider;
      }
    }

    // Generate prompt

    const response =
      await provider.generate({
        task: task.trim(),
        keywords: generatorKeywords,
        aiTool,
        plan,
        inlineKeywords: inlineKeywords.filter(
          (k) => typeof k === "string" && k.trim()
        ),
        globalKeywords: globalKeywords.filter(
          (k) => typeof k === "string" && k.trim()
        ),
        attachments: safeAttachments,
        structure: isLoggedIn
          ? structure || null
          : null,
        isLoggedIn,
        referenceImageMode,
        referenceImageBase64:
          safeReferenceImageBase64,
        referenceImageMimeType:
          safeReferenceImageMimeType,
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
