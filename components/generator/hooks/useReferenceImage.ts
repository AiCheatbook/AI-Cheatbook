import { useState } from "react";
import type { ReferenceImageMode } from "../aiProvider";

export function useReferenceImage() {
  const [mode, setMode] =
    useState<ReferenceImageMode>("none");
  const [preview, setPreview] = useState<
    string | null
  >(null);
  const [base64, setBase64] = useState<
    string | null
  >(null);
  const [mimeType, setMimeType] = useState<
    string | null
  >(null);
  const [uploadError, setUploadError] =
    useState<string | null>(null);

  const MAX_FILE_SIZE_BYTES =
    4 * 1024 * 1024;

  function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        "Image is too large. Please use one under 4MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        reader.result as string;
      const base64Data = result.split(
        ","
      )[1];

      setBase64(base64Data);
      setMimeType(file.type);
      setPreview(result);
    };

    reader.onerror = () => {
      setUploadError(
        "Couldn't read that image. Please try a different file."
      );
    };

    reader.readAsDataURL(file);
  }

  function clear() {
    setPreview(null);
    setBase64(null);
    setMimeType(null);
    setUploadError(null);
  }

  function changeMode(
    newMode: ReferenceImageMode
  ) {
    setMode(newMode);

    if (newMode !== "upload") {
      clear();
    }
  }

  return {
    mode,
    setMode: changeMode,
    preview,
    base64,
    mimeType,
    uploadError,
    handleFileSelected,
    clear,
  };
}
