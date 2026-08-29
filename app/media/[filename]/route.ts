import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(
  process.cwd(),
  "storage",
  "uploads"
);

const CONTENT_TYPES: Record<
  string,
  string
> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      filename: string;
    }>;
  }
) {
  const { filename } = await params;

  /*
   * Reject anything that isn't a plain
   * filename we generated ourselves
   * (blocks path traversal attempts like
   * "../../secret-file").
   */

  if (
    !/^[a-f0-9-]+\.[a-z]+$/i.test(
      filename
    )
  ) {
    return new NextResponse(
      "Not found",
      { status: 404 }
    );
  }

  const extension = filename
    .split(".")
    .pop()!
    .toLowerCase();

  const contentType =
    CONTENT_TYPES[extension];

  if (!contentType) {
    return new NextResponse(
      "Not found",
      { status: 404 }
    );
  }

  try {
    const filePath = path.join(
      UPLOAD_DIR,
      filename
    );

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
        },
      }
    );
  } catch {
    return new NextResponse(
      "Not found",
      { status: 404 }
    );
  }
}
