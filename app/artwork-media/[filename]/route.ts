import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/*
 * Serves artwork uploaded via
 * /api/artwork-upload. Same persistent-path
 * pattern as /media/[filename]/route.ts, in
 * its own subfolder to keep artwork
 * (potentially large video/audio files)
 * separate from CMS thumbnails.
 */

const UPLOAD_DIR =
  process.env.ARTWORK_UPLOAD_DIR ||
  "/home/u187217900/domains/aicheatbook.com/persistent-storage/artwork";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ filename: string }>;
  }
) {
  const { filename } = await params;

  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("..") ||
    filename.includes("\\")
  ) {
    return NextResponse.json(
      { error: "Invalid filename." },
      { status: 400 }
    );
  }

  const extension = filename
    .split(".")
    .pop()
    ?.toLowerCase();

  const contentType = extension
    ? CONTENT_TYPES[extension]
    : undefined;

  if (!contentType) {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 400 }
    );
  }

  const filePath = path.join(
    /* turbopackIgnore: true */
    UPLOAD_DIR,
    filename
  );

  try {
    const fileBuffer = await readFile(
      filePath
    );

    return new NextResponse(
      new Uint8Array(fileBuffer),
      {
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "public, max-age=31536000, immutable",
          "Accept-Ranges": "bytes",
        },
      }
    );
  } catch (err) {
    console.error(
      "Failed to serve artwork file.",
      "\nRequested filename:",
      filename,
      "\nResolved path:",
      filePath,
      "\nError:",
      err
    );

    return NextResponse.json(
      { error: "File not found." },
      { status: 404 }
    );
  }
}
