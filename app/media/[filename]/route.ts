import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/*
 * Serves files that were uploaded via
 * /api/upload — those are saved to
 * storage/uploads/ (deliberately outside
 * public/ so a git deploy never touches
 * them), but nothing was ever actually
 * serving that folder at the /media/ URL
 * the upload route promises. This route is
 * that missing piece — every uploaded
 * image has been 404ing until now.
 */

/*
 * Must match the UPLOAD_DIR in
 * app/api/upload/route.ts exactly — a fixed
 * absolute path outside the versioned build
 * folder Hostinger recreates on every deploy.
 */

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  "/home/u187217900/domains/aicheatbook.com/persistent-storage/uploads";

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
   * filename — no path traversal (e.g.
   * "../../../etc/passwd") allowed.
   */

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
        },
      }
    );
  } catch (err) {
    /*
     * Logged with full detail server-side
     * — a generic 404 can mean several
     * different things (file genuinely
     * missing, permissions issue, wrong
     * resolved path on this specific
     * hosting setup) and this makes it
     * possible to tell which.
     */

    console.error(
      "Failed to serve uploaded file.",
      "\nRequested filename:",
      filename,
      "\nResolved path:",
      filePath,
      "\nprocess.cwd():",
      process.cwd(),
      "\nError:",
      err
    );

    return NextResponse.json(
      { error: "File not found." },
      { status: 404 }
    );
  }
}
