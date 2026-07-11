
## Ringkasan

Menyempurnakan editor CMS Homepage menjadi workflow profesional: **Edit → Dirty → Save Draft → Preview → Publish**, tanpa auto-save, dengan standar field yang konsisten di semua section, validasi, dan versioning ringan.

---

## 1. Standar Field Setiap Section

Setiap section Homepage akan memiliki blok "Pengaturan Section" yang seragam:

- Visibility (switch)
- Section Badge (opsional, text)
- Section Title (wajib)
- Section Subtitle (opsional) ← **baru**
- Background Color (color picker + preset)
- Background Image (opsional, MediaPicker)
- Padding Top (angka px)
- Padding Bottom (angka px)
- Sort Order (angka)

Disimpan pada kolom baru pada payload `data.meta`, sehingga struktur konten (items, rows, dsb) tidak berubah.

Frontend section renderer akan membaca `meta.badge`, `meta.subtitle`, `meta.bgColor`, `meta.bgImage`, `meta.paddingTop/Bottom` bila tersedia (dengan fallback ke tampilan sekarang).

---

## 2. Perubahan Skema Database

Migration ringan pada `homepage_sections`:

```
ALTER TABLE public.homepage_sections
  ADD COLUMN draft_data jsonb,
  ADD COLUMN status text NOT NULL DEFAULT 'draft',   -- draft | published | modified
  ADD COLUMN last_published_at timestamptz,
  ADD COLUMN last_saved_at timestamptz,
  ADD COLUMN last_saved_by uuid REFERENCES auth.users(id);

CREATE TABLE public.homepage_section_versions (
  id uuid PK,
  section_key text NOT NULL,
  version int NOT NULL,
  data jsonb NOT NULL,
  title text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  note text
);
```

- `data` = konten LIVE (yang tampil di frontend)
- `draft_data` = konten draft (belum publish)
- Status:
  - `draft` = belum pernah publish
  - `published` = draft == live
  - `modified` = draft berbeda dari live
- Tiap **Publish** membuat entry baru di `homepage_section_versions` (Version 1, 2, 3…).

GRANT + RLS mengikuti pola tabel existing (admin only).

Header & Footer di `site_settings` dapat pola yang sama (kolom `draft` di JSON).

---

## 3. Editor Workflow Baru (`SectionEditor.tsx`)

Menghapus auto-save. Menggantinya dengan:

**State internal:**
- `serverDraft`, `serverPublished`
- `local` (dari serverDraft ?? serverPublished)
- `isDirty` = `local !== serverDraft`

**Toolbar section editor:**
- Status badge: `Draft` / `Published` / `Modified` / `● Belum Disimpan`
- Info: "Terakhir disimpan: 12 Jul 2026, 14:22 oleh Budi"
- Tombol: **Reset** • **Save Draft** • **Preview** • **Publish**
- Tombol menampilkan state `Saving...` + disabled saat request berjalan.

**Aksi:**
- **Save Draft** → validasi → `update draft_data`, status `modified` (jika ada published) atau `draft`. Toast sukses/gagal. Data editor tidak hilang jika error.
- **Preview** → buka `/?preview=<sectionKey>&t=<ts>` di tab baru; frontend membaca query dan menampilkan `draft_data` (SSR-safe fallback ke live).
- **Publish** → validasi → copy `draft_data → data`, set `status=published`, `last_published_at`, insert row versi.
- **Reset** → set `local = serverDraft` (konfirmasi bila dirty).

**Navigation guard:**
- Router `blocker` (TanStack) + `beforeunload` saat `isDirty`.
- Dialog 3 pilihan: **Save Draft** / **Discard** / **Cancel**.

**Validasi (zod):**
- Section title wajib (≤120)
- Subtitle ≤280
- URL & Image URL valid
- Angka untuk harga, padding, sort order
- Field spesifik per form (mengikuti yang sudah ada)

Toast pakai `sonner` (sudah tersedia).

---

## 4. Versioning Sederhana

Panel "Riwayat Versi" (collapsible) di bawah editor:
- List: `Version N — 12 Jul 2026 14:22 — Budi`
- Tombol **Restore** → memuat data versi ke editor sebagai draft (belum publish). User tetap harus Publish untuk mengaktifkan.
- Tidak ada auto-delete; simpel append-only.

---

## 5. Frontend (`/`)

- Semua `sections/*` sudah baca dari homepage_sections. Perubahannya:
  - Baca kolom `data` (live) secara default.
  - Bila query `?preview=<key>` ada dan user authenticated admin, tampilkan `draft_data` untuk section itu.
- SectionRenderer menerapkan `meta.badge/subtitle/bgColor/bgImage/paddingTop/paddingBottom` melalui wrapper standar.

---

## 6. Header & Footer

Menggunakan pola yang sama:
- Simpan `draft` dan `live` di `site_settings.value`.
- Tombol Save Draft / Preview / Publish / Reset.
- Navigation guard sama.

Tanpa field visibility/padding (tidak relevan), tapi tetap ada dirty state + workflow.

---

## 7. Yang TIDAK berubah

- Struktur form per section (`forms.tsx`) tetap — hanya wrapper toolbar & meta yang ditambah.
- Blog / Media / SEO / Settings tidak diubah pada iterasi ini (bisa iterasi berikutnya jika diperlukan).
- Desain visual editor tetap konsisten dengan yang ada.

---

## Deliverables (file)

Baru:
- `src/components/admin/homepage/SectionMeta.tsx` (form field standar)
- `src/components/admin/homepage/EditorToolbar.tsx`
- `src/components/admin/homepage/UnsavedDialog.tsx`
- `src/components/admin/homepage/VersionPanel.tsx`
- `src/lib/admin/useDirtyGuard.ts`
- `src/lib/admin/sectionValidators.ts`
- Migration SQL untuk kolom & tabel versi.

Diubah:
- `SectionEditor.tsx` (rewrite workflow)
- `admin.website.header.tsx`, `admin.website.footer.tsx` (workflow baru)
- `SectionRenderer.tsx` + section components untuk membaca `meta`
- Route `/` untuk mode preview
- `homepageDefaults.ts` untuk menyertakan default `meta` (subtitle, dsb)

---

Apakah rencana ini disetujui untuk saya implementasikan sekarang? Jika ada bagian yang ingin dikurangi (misal versioning ditunda), beri tahu sebelum saya mulai.
