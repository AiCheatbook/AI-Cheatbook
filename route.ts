import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

/*
 * Where uploaded files live on the server.
 *
 * Confirmed via server logs: Hostinger builds
 * this app into a NEW folder for every single
 * deployment —
 *   .../hbuilds/versions/{unique-id}/nodejs/
 * — so anything saved relative to
 * process.cwd() only survives until the next
 * deploy, then becomes permanently orphaned.
 *
 * This now uses a fixed, absolute path OUTSIDE
 * that versioned build folder — a sibling of
 * hbuilds/ at the persistent domain root, which
 * Hostinger's deployment system does not
 * recreate. Override with the UPLOAD_DIR env
 * var if this exact path needs adjusting for
 * your account.
 */

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  "/home/u187217900/domains/aicheatbook.com/persistent-storage/uploads";

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

    const rawBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    /*
     * GIFs are left untouched — re-encoding
     * through sharp can break animation.
     * Everything else is resized (capped at
     * 1600px wide, never upscaled) and
     * converted to WebP for real, meaningful
     * savings — this is the actual fix for
     * the "Improve image delivery" PageSpeed
     * finding, done at upload time so it
     * doesn't depend on Next's image
     * optimizer (which unoptimized:true
     * deliberately bypasses, for the
     * separate reason of Hostinger
     * compatibility).
     */

    const isGif = file.type === "image/gif";

    const extension = isGif
      ? "gif"
      : "webp";

    const filename = `${crypto.randomUUID()}.${extension}`;

    const filePath = path.join(
      /* turbopackIgnore: true */
      UPLOAD_DIR,
      filename
    );

    const buffer = isGif
      ? rawBuffer
      : await sharp(rawBuffer)
          .resize({
            width: 1600,
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();

    await writeFile(filePath, buffer);

    console.log(
      "Upload succeeded.",
      "\nSaved to:",
      filePath,
      "\nOriginal size:",
      rawBuffer.length,
      "bytes",
      "\nFinal size:",
      buffer.length,
      "bytes",
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
