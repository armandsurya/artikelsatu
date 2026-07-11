import { Modal } from "./primitives";

export function UnsavedDialog({
  open, onSave, onDiscard, onCancel, saving,
}: {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  if (!open) return null;
  return (
    <Modal title="Perubahan belum disimpan" onClose={onCancel}>
      <p className="text-sm text-muted-foreground">
        Anda memiliki perubahan yang belum disimpan. Apakah ingin menyimpan sebagai draft terlebih dahulu sebelum meninggalkan halaman?
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Save Draft"}
        </button>
      </div>
    </Modal>
  );
}
