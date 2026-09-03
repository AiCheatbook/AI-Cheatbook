import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile } from "fs/promises";
import path from "path";

/*
 * Separate from /api/upload (CMS thumbnails,
 * 8MB, images only) — artwork has real
 * differences: much larger files, video/audio
 * support (which sharp can't touch), and it
 * gets uploaded by any logged-in user, not
 * just admins.
 *
 * Same persistent-storage path fix as the
 * main upload route, in its own subfolder to
 * keep things organized.
 */

const UPLOAD_DIR =
  process.env.ARTWORK_UPLOAD_DIR ||
  "/home/u187217900/domains/aicheatbook.com/persistent-storage/artwork";

const MAX_SIZE_BYTES =
  100 * 1024 * 1024; // 100MB, per spec

const ALLOWED_TYPES: Record<
  string,
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

function mediaTypeFor(
  mimeType: string
): "image" | "video" | "audio" | null {
  if (mimeType.startsWith("image/"))
    return "image";
  if (mimeType.startsWith("video/"))
    return "video";
  if (mimeType.startsWith("audio/"))
    return "audio";
  return null;
}

export async function POST(
  request: Request
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please log in to submit artwork.",
        },
        { status: 401 }
      );
    }

    const formData =
      await request.formData();

    const file = formData.get("file");

    if (
      !file ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided.",
        },
        { status: 400 }
      );
    }

    const extension =
      ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported file type. Allowed: images, MP4/WebM/MOV video, MP3/WAV/OGG audio.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File is larger than the 100MB limit.",
        },
        { status: 400 }
      );
    }

    const mediaType = mediaTypeFor(
      file.type
    );

    if (!mediaType) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported media type.",
        },
        { status: 400 }
      );
    }

    const filename = `${crypto.randomUUID()}.${extension}`;

    const filePath = path.join(
      /* turbopackIgnore: true */
      UPLOAD_DIR,
      filename
    );

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(filePath, buffer);

    const publicUrl = `/artwork-media/${filename}`;

    const { data: asset, error } =
      await supabase
        .from("media_assets")
        .insert({
          user_id: user.id,
          media_type: mediaType,
          mime_type: file.type,
          file_size_bytes: file.size,
          storage_provider: "hostinger",
          storage_path: publicUrl,
        })
        .select("id")
        .single();

    if (error) {
      console.error(
        "Failed to create media_assets row:",
        error.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Upload saved, but failed to record it. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaAssetId: asset.id,
      url: publicUrl,
    });
  } catch (error) {
    console.error(
      "Artwork upload failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Upload failed.",
      },
      { status: 500 }
    );
  }
}
