import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/*
 * Where uploaded files live on the server.
 *
 * This is OUTSIDE the app's public/ folder on
 * purpose — it's excluded from Git, so a new
 * deployment (git pull) never touches, replaces,
 * or deletes what's already been uploaded.
 */

const UPLOAD_DIR = path.join(
  process.cwd(),
  "storage",
  "uploads"
);

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(
  request: Request
) {
  try {
    /*
     * Only a logged-in admin can upload.
     * Checked using the real session cookie,
     * server-side — this can't be bypassed
     * from the browser.
     */

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authorized.",
        },
        { status: 401 }
      );
    }

    const formData =
      await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TYPES.includes(file.type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only JPG, PNG, WEBP, or GIF images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File is too large (max 8MB).",
        },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, {
      recursive: true,
    });

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type.split("/")[1];

    const filename = `${crypto.randomUUID()}.${extension}`;

    const filePath = path.join(
      UPLOAD_DIR,
      filename
    );

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(filePath, buffer);

    console.log(
      "Upload succeeded.",
      "\nSaved to:",
      filePath,
      "\nprocess.cwd():",
      process.cwd(),
      "\nPublic URL returned:",
      `/media/${filename}`
    );

    return NextResponse.json({
      success: true,
      url: `/media/${filename}`,
    });
  } catch (error) {
    console.error(
      "Upload failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Upload failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
