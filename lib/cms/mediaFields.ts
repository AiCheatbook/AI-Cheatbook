export type MediaSource =
  | ""
  | "youtube"
  | "hostinger"
  | "supabase_storage";

export type MediaAspectRatio =
  | ""
  | "9:16"
  | "16:9"
  | "4:5";

export type MediaFields = {
  source: MediaSource;
  aspectRatio: MediaAspectRatio;
};

export function emptyMediaFields(): MediaFields {
  return {
    source: "",
    aspectRatio: "",
  };
}

export function mediaFieldsToRow(
  media: MediaFields
) {
  return {
    media_source: media.source || null,
    media_aspect_ratio:
      media.aspectRatio || null,
  };
}

export function rowToMediaFields(
  row: Record<string, unknown>
): MediaFields {
  return {
    source:
      (row.media_source as MediaSource) ||
      "",
    aspectRatio:
      (row.media_aspect_ratio as MediaAspectRatio) ||
      "",
  };
}
