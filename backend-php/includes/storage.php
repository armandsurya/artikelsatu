<?php
/**
 * Storage lokal — pengganti Supabase Storage.
 *
 * File disimpan di /uploads/<bucket>/<path>, diakses lewat URL publik
 * yang dikonfigurasi di config/config.php (`upload_base_url`).
 */

declare(strict_types=1);

/** Bucket yang diizinkan. */
const ALLOWED_BUCKETS = ['media'];

/**
 * Normalisasi path agar tidak bisa keluar dari direktori upload
 * (mencegah path traversal seperti "../../config/config.php").
 */
function safe_relative_path(string $path): string
{
    $path = str_replace('\\', '/', trim($path, '/'));
    $segments = [];
    foreach (explode('/', $path) as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..') {
            continue;
        }
        // Hanya karakter aman untuk nama file.
        $segments[] = preg_replace('/[^A-Za-z0-9._-]/', '-', $segment);
    }
    if ($segments === []) {
        json_error('Path file tidak valid', 400);
    }
    return implode('/', $segments);
}

function assert_bucket(string $bucket): string
{
    if (!in_array($bucket, ALLOWED_BUCKETS, true)) {
        json_error("Bucket tidak dikenal: {$bucket}", 404);
    }
    return $bucket;
}

/** POST /storage/upload — multipart form: bucket, path, file, upsert. */
function handle_storage_upload(): never
{
    require_content_manager();
    $config = app_config();

    $bucket = assert_bucket((string) ($_POST['bucket'] ?? 'media'));
    $path   = safe_relative_path((string) ($_POST['path'] ?? ''));
    $upsert = ($_POST['upsert'] ?? '0') === '1';

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        json_error('File gagal diunggah', 400);
    }

    $file = $_FILES['file'];
    if ($file['size'] > $config['max_upload_mb'] * 1024 * 1024) {
        json_error("Ukuran file melebihi {$config['max_upload_mb']}MB", 413);
    }

    // Tipe file diverifikasi dari isi file, bukan dari header yang dikirim klien.
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) $finfo->file($file['tmp_name']);
    if (!in_array($mimeType, $config['allowed_mime'], true)) {
        json_error("Tipe file tidak diizinkan: {$mimeType}", 415);
    }

    $target = $config['upload_dir'] . '/' . $bucket . '/' . $path;
    if (!$upsert && file_exists($target)) {
        json_error('File sudah ada', 409, 'Duplicate');
    }

    $dir = dirname($target);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        json_error('Gagal membuat direktori penyimpanan', 500);
    }
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        json_error('Gagal menyimpan file', 500);
    }
    @chmod($target, 0644);

    json_ok([
        'path'      => $path,
        'bucket'    => $bucket,
        'url'       => rtrim($config['upload_base_url'], '/') . '/' . $bucket . '/' . $path,
        'mime_type' => $mimeType,
        'size'      => (int) $file['size'],
    ]);
}

/** POST /storage/remove — { bucket, paths: [] } */
function handle_storage_remove(array $body): never
{
    require_content_manager();
    $config = app_config();

    $bucket = assert_bucket((string) ($body['bucket'] ?? 'media'));
    $paths  = is_array($body['paths'] ?? null) ? $body['paths'] : [];

    $removed = [];
    foreach ($paths as $path) {
        $relative = safe_relative_path((string) $path);
        $target   = $config['upload_dir'] . '/' . $bucket . '/' . $relative;
        if (is_file($target)) {
            @unlink($target);
            $removed[] = ['name' => $relative];
        }
    }

    json_ok($removed);
}

/**
 * POST /storage/sign — { bucket, path, expiresIn }
 * Bucket lokal bersifat publik, jadi "signed URL" cukup URL langsung
 * dengan penanda kedaluwarsa untuk kompatibilitas bentuk respons.
 */
function handle_storage_sign(array $body): never
{
    require_content_manager();
    $config = app_config();

    $bucket    = assert_bucket((string) ($body['bucket'] ?? 'media'));
    $path      = safe_relative_path((string) ($body['path'] ?? ''));
    $expiresIn = max(60, (int) ($body['expiresIn'] ?? 3600));

    json_ok([
        'signedUrl' => rtrim($config['upload_base_url'], '/') . '/' . $bucket . '/' . $path
                       . '?expires=' . (time() + $expiresIn),
    ]);
}
