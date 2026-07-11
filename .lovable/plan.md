# Redesign Media → Digital Asset Management (DAM)

Tujuan: Media menjadi WordPress-style Media Library yang dipakai seluruh editor (Homepage, Blog, Header, Footer, SEO) sebagai satu-satunya sumber gambar.

---

## 1. Perubahan Struktur Menu (Sidebar)

`src/components/admin/AdminShell.tsx`:
- Pindahkan **Media** dari sub-menu Blog menjadi menu utama level 1.
- Urutan final: Dashboard · Website · Blog · **Media** · SEO · Redirect URL · Pengguna · Role & Permission · Pengaturan · Keamanan · Log Aktivitas.

---

## 2. Skema Database (migration)

Tambah kolom pada tabel `media` (yang sudah ada: `id, name, path, url, mime_type, size_bytes, uploaded_by, created_at`):

- `alt text` · `title text` · `caption text` · `description text`
- `width int` · `height int`
- `updated_at timestamptz default now()` + trigger `set_updated_at`

Tabel baru `media_usage` untuk melacak "digunakan di mana":
- `id, media_id (FK media on delete restrict), context text` (mis. `homepage_section`, `blog_post`, `site_settings`, `seo`), `context_id text` (mis. `hero`, uuid blog, `header`), `field text` (mis. `image`, `og_image`), `created_at`
- Unique `(media_id, context, context_id, field)`

Grants + RLS (baca semua authenticated; tulis super_admin via `has_role`).

Storage: bucket `media` sudah ada (private). Tetap gunakan signed URL 1 tahun.

---

## 3. Upload Pipeline (audit + rewrite)

File: `src/lib/media/upload.ts` (baru)

Alur:
1. **Validation** (client): whitelist mime = `jpg/jpeg/png/webp/svg+xml/gif/avif`; max 5 MB; tolak dengan pesan spesifik.
2. **Slugify filename** SEO-friendly: `slugify(originalName-without-ext) + '.' + ext`, contoh `hero-homepage.webp`. Jika bentrok tambah `-2`, `-3`.
3. **Compression** (optional, client-side): jpg/png/webp diproses via `<canvas>` (`createImageBitmap` → resize maks 2560px sisi terpanjang → `canvas.toBlob('image/webp', 0.85)`); svg & gif dilewati.
4. **Read dimensions** via `createImageBitmap` sebelum upload.
5. **Storage upload** ke bucket `media` (path: `YYYY/MM/<slug>`).
6. **Create signed URL** (1 tahun).
7. **Insert row** ke `media` dengan seluruh metadata.
8. Error handling: bedakan Storage error, DB error, Permission (RLS) error, ukuran, format — surface pesan asli.

---

## 4. Halaman `/admin/media` (redesign penuh)

File: `src/routes/_authenticated/admin.media.tsx` + komponen di `src/components/admin/media/`.

- **Toolbar**: Upload (drag-drop area juga), Search, Filter (type, uploaded by, tanggal), Sort (newest/oldest/name/size), Multi-select toggle.
- **Grid card**: thumbnail, nama, ukuran (KB/MB), dimensi (WxH), tanggal, mime badge, checkbox multi-select.
- **Pagination** 40/halaman.
- **Bulk**: Delete (dengan cek `media_usage`), Download (zip via `JSZip`).
- **Detail drawer** (klik card):
  - Preview besar
  - Form editable: ALT, Title, Caption, Description, Rename (semuanya dengan tombol **Save**, bukan auto-save)
  - Info read-only: URL, Path, Ukuran, Dimensi, Uploaded By, Created At, Updated At
  - Tombol: Copy URL, Copy Path, Replace file (upload baru ke path lama → URL tetap), Delete
  - Panel "Dipakai di": list dari `media_usage` dengan link ke context.

---

## 5. Media Picker (reusable)

File: `src/components/admin/media/MediaPicker.tsx` (Dialog + grid Media Library + tab Upload).

Ganti seluruh input URL/upload di editor:
- `src/components/admin/homepage/forms.tsx` — Hero image, CTA background, dsb (field bertipe image).
- `src/components/admin/BlogEditor.tsx` — Featured image, OG image, konten Tiptap (image button).
- `src/routes/_authenticated/admin.website.header.tsx` — Logo.
- `src/routes/_authenticated/admin.website.footer.tsx` — Logo.
- `src/routes/_authenticated/admin.seo.tsx` — OG image, schema image.

Setiap kali picker memilih image, panggil helper `trackMediaUsage(mediaId, context, contextId, field)` yang meng-upsert baris `media_usage`. Saat field diganti/dikosongkan, hapus baris usage sebelumnya.

---

## 6. Replace tanpa mengubah URL

`replaceMedia(mediaId, newFile)`:
1. Validate + compress.
2. `storage.update(existingPath, newFile, { upsert: true })` — path & URL tetap.
3. Update kolom `size_bytes, width, height, mime_type, updated_at`.
4. Invalidate cache `['media']` + `PUBLISHED_QUERY_KEY` supaya frontend refetch (browser bust cache via `?v=updated_at`).

---

## 7. Delete guard

Sebelum delete, query `media_usage` untuk `media_id`. Bila ada:
- Tampilkan dialog dengan daftar context+link.
- Butuh konfirmasi "Hapus paksa" yang juga menghapus referensi.
Bila kosong: hapus storage + row.

---

## 8. Frontend

Tidak ada perubahan besar. Semua field image di CMS sudah berbentuk URL yang tersimpan di `homepage_sections.data`, `blog_posts.featured_image`, `site_settings`, dsb. Frontend hanya membaca URL tersebut — sekarang URL itu selalu berasal dari `media.url`.

---

## 9. Verifikasi

- Playwright: upload file 3MB PNG → cek muncul di grid, dimensi terbaca, ALT bisa disave, picker di editor Hero menampilkan image yang sama, delete diblokir jika usage tercatat.
- Manual: build hijau (`bun run build` dijalankan otomatis oleh harness).

---

## Detail teknis singkat

- Kompresi client-side menghindari kebutuhan sharp/ffmpeg di Worker (tidak didukung).
- Signed URL 1 tahun disimpan di `media.url`; replace tidak mengubah path → URL stabil.
- `media_usage` mencegah orphan reference & jadi dasar fitur "Usage".
- Semua write via `supabase` client biasa; RLS super_admin sudah ada (via `has_role`).

## Cakupan file (perkiraan)

- Migration: 1 file baru (kolom + tabel usage + policies + trigger).
- Baru: `src/lib/media/upload.ts`, `src/lib/media/usage.ts`, `src/components/admin/media/{MediaGrid,MediaCard,MediaDetailDrawer,MediaPicker,MediaUploader}.tsx`, `src/components/admin/media/ImageField.tsx`.
- Edit: `AdminShell.tsx`, `admin.media.tsx`, editor Homepage forms, BlogEditor, admin header/footer/seo routes.

Setelah rencana disetujui, mulai dari migration (butuh approval terpisah) lalu pipeline upload, halaman Media, MediaPicker, integrasi editor, dan verifikasi.
