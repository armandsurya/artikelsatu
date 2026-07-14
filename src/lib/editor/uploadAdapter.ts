/**
 * CKEditor 5 upload adapter that pipes files through the Media Library
 * (Supabase storage + `media` table row) so every drop/paste/upload lands
 * where WordPress-style Media Library expects it.
 */
type Loader = {
  file: Promise<File>;
};

type FileRepository = {
  createUploadAdapter?: (loader: Loader) => unknown;
};

type EditorLike = {
  plugins: { get: (name: string) => FileRepository };
};

class SupabaseUploadAdapter {
  private loader: Loader;
  private aborted = false;
  constructor(loader: Loader) {
    this.loader = loader;
  }

  async upload(): Promise<{ default: string }> {
    const file = await this.loader.file;
    if (this.aborted) throw new Error("Upload dibatalkan");
    const { uploadMediaFile } = await import("@/lib/media/upload");
    const res = await uploadMediaFile(file);
    if (!res.ok) throw new Error(res.message || "Upload gagal");
    return { default: res.media.url };
  }

  abort(): void {
    this.aborted = true;
  }
}

export function SupabaseUploadAdapterPlugin(editor: EditorLike): void {
  const repo = editor.plugins.get("FileRepository");
  repo.createUploadAdapter = (loader: Loader) => new SupabaseUploadAdapter(loader);
}
