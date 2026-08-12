import { api } from "@/integrations/api/browser";

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
] as const;

export const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year
const COMPRESS_MAX_DIM = 2560;

export type UploadedMedia = {
  id: string;
  name: string;
  path: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
};

/* ---------------- helpers ---------------- */

export function slugifyFilename(originalName: string, forcedExt?: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = (forcedExt ?? (dot > 0 ? originalName.slice(dot + 1) : "bin"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const slug =
    base
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file";
  return `${slug}.${ext}`;
}

function formatMonthPath(): string {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function readDimensions(
  file: Blob,
): Promise<{ width: number | null; height: number | null }> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      return dims;
    }
  } catch {
    /* fall back below */
  }
  return await new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function compressImage(file: File): Promise<{ blob: Blob; mime: string; ext: string }> {
  // svg / gif / avif: keep as-is (avoid animation/vector loss)
  if (file.type === "image/svg+xml" || file.type === "image/gif" || file.type === "image/avif") {
    return { blob: file, mime: file.type, ext: file.name.split(".").pop() ?? "" };
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, COMPRESS_MAX_DIM / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas ctx");
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.85));
    if (!blob) throw new Error("toBlob failed");
    // Only use compressed version when it's actually smaller
    if (blob.size < file.size) return { blob, mime: "image/webp", ext: "webp" };
    return { blob: file, mime: file.type, ext: file.name.split(".").pop() ?? "" };
  } catch {
    return { blob: file, mime: file.type, ext: file.name.split(".").pop() ?? "" };
  }
}

/* ---------------- validation ---------------- */

export type ValidationError = { code: "size" | "format" | "empty"; message: string };

export function validateFile(file: File): ValidationError | null {
  if (!file || file.size === 0) return { code: "empty", message: "File kosong." };
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return {
      code: "format",
      message: `Format ${file.type || "tidak dikenal"} tidak didukung. Gunakan JPG, PNG, WebP, SVG, GIF, atau AVIF.`,
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      code: "size",
      message: `Ukuran ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 5 MB.`,
    };
  }
  return null;
}

/* ---------------- upload pipeline ---------------- */

export type UploadResult =
  | { ok: true; media: UploadedMedia }
  | { ok: false; step: string; message: string };

export async function uploadMediaFile(
  file: File,
  opts?: { renameTo?: string },
): Promise<UploadResult> {
  const invalid = validateFile(file);
  if (invalid) return { ok: false, step: "validation", message: invalid.message };

  // Compress (may swap type to webp)
  const { blob, mime, ext } = await compressImage(file);

  // Read dimensions from the actual blob being uploaded
  const { width, height } = await readDimensions(blob);

  // SEO-friendly filename
  const baseName = opts?.renameTo ?? file.name;
  let finalName = slugifyFilename(baseName, ext);
  const folder = formatMonthPath();
  let path = `${folder}/${finalName}`;

  // Ensure no collision
  for (let i = 2; i < 20; i++) {
    const { data: existing } = await api
      .from("media")
      .select("id")
      .eq("path", path)
      .maybeSingle();
    if (!existing) break;
    const dot = finalName.lastIndexOf(".");
    finalName = `${finalName.slice(0, dot)}-${i}${finalName.slice(dot)}`;
    path = `${folder}/${finalName}`;
  }

  // Storage upload
  const { error: upErr } = await api.storage.from("media").upload(path, blob, {
    cacheControl: "31536000",
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { ok: false, step: "storage", message: upErr.message };

  // Signed URL (bucket is private)
  const { data: signed, error: signErr } = await api.storage
    .from("media")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !signed?.signedUrl) {
    await api.storage.from("media").remove([path]);
    return { ok: false, step: "sign", message: signErr?.message ?? "Gagal membuat signed URL." };
  }

  // DB insert
  const user = (await api.auth.getUser()).data.user;
  const { data: inserted, error: dbErr } = await api
    .from("media")
    .insert({
      name: finalName,
      path,
      url: signed.signedUrl,
      mime_type: mime,
      size_bytes: blob.size,
      width,
      height,
      uploaded_by: user?.id,
    })
    .select("*")
    .single();
  if (dbErr || !inserted) {
    await api.storage.from("media").remove([path]);
    return { ok: false, step: "database", message: dbErr?.message ?? "Gagal menyimpan metadata." };
  }

  return {
    ok: true,
    media: {
      id: inserted.id,
      name: inserted.name,
      path: inserted.path,
      url: inserted.url,
      mime_type: inserted.mime_type ?? mime,
      size_bytes: inserted.size_bytes ?? blob.size,
      width: (inserted as { width: number | null }).width ?? width,
      height: (inserted as { height: number | null }).height ?? height,
    },
  };
}

/* ---------------- replace ---------------- */

export async function replaceMediaFile(mediaId: string, file: File): Promise<UploadResult> {
  const invalid = validateFile(file);
  if (invalid) return { ok: false, step: "validation", message: invalid.message };
  const { data: row, error: rowErr } = await api
    .from("media")
    .select("*")
    .eq("id", mediaId)
    .single();
  if (rowErr || !row)
    return { ok: false, step: "database", message: rowErr?.message ?? "Media tidak ditemukan." };

  const { blob, mime } = await compressImage(file);
  const { width, height } = await readDimensions(blob);

  const { error: upErr } = await api.storage.from("media").upload(row.path, blob, {
    cacheControl: "31536000",
    contentType: mime,
    upsert: true,
  });
  if (upErr) return { ok: false, step: "storage", message: upErr.message };

  // Signed URL may change token — refresh it
  const { data: signed } = await api.storage
    .from("media")
    .createSignedUrl(row.path, SIGNED_URL_TTL);

  const { data: updated, error: dbErr } = await api
    .from("media")
    .update({
      mime_type: mime,
      size_bytes: blob.size,
      width,
      height,
      url: signed?.signedUrl ?? row.url,
    })
    .eq("id", mediaId)
    .select("*")
    .single();
  if (dbErr || !updated)
    return { ok: false, step: "database", message: dbErr?.message ?? "Gagal update metadata." };

  return {
    ok: true,
    media: {
      id: updated.id,
      name: updated.name,
      path: updated.path,
      url: updated.url,
      mime_type: updated.mime_type ?? mime,
      size_bytes: updated.size_bytes ?? blob.size,
      width: (updated as { width: number | null }).width ?? width,
      height: (updated as { height: number | null }).height ?? height,
    },
  };
}

export function formatBytes(n?: number | null): string {
  if (!n && n !== 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
