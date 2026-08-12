<?php
/**
 * Konfigurasi aplikasi.
 *
 * Nilai dibaca dari environment bila tersedia (disarankan di production),
 * dengan fallback ke nilai default agar simulasi lokal langsung jalan.
 */

declare(strict_types=1);

/** Ambil nilai environment dengan fallback. */
function env_value(string $key, string $default = ''): string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

return [
    // --- Database -----------------------------------------------------
    'db' => [
        'host'     => env_value('DB_HOST', '127.0.0.1'),
        'port'     => (int) env_value('DB_PORT', '3306'),
        'name'     => env_value('DB_NAME', 'artikelpro'),
        'user'     => env_value('DB_USER', 'root'),
        'password' => env_value('DB_PASSWORD', ''),
        'charset'  => 'utf8mb4',
    ],

    // --- Autentikasi --------------------------------------------------
    // WAJIB diganti di production: minimal 32 karakter acak.
    'jwt_secret'      => env_value('JWT_SECRET', 'ganti-secret-ini-dengan-string-acak-32-karakter'),
    'jwt_ttl'         => (int) env_value('JWT_TTL', '3600'),         // detik (access token)
    'refresh_ttl'     => (int) env_value('REFRESH_TTL', '2592000'),  // detik (30 hari)
    // Token internal untuk request server-to-server (SSR / server function).
    // Kosongkan bila tidak dipakai.
    'service_token'   => env_value('API_SERVICE_TOKEN', ''),
    'debug'           => env_value('APP_DEBUG', '0') === '1',
    'allow_signup'    => env_value('ALLOW_SIGNUP', '1') === '1',     // hanya untuk admin pertama

    // --- Storage / uploads --------------------------------------------
    // Direktori fisik tempat file disimpan.
    'upload_dir'      => dirname(__DIR__) . '/uploads',
    // URL publik yang memetakan ke direktori di atas.
    'upload_base_url' => env_value('UPLOAD_BASE_URL', 'http://localhost:8000/uploads'),
    'max_upload_mb'   => (int) env_value('MAX_UPLOAD_MB', '10'),
    'allowed_mime'    => [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
        'application/pdf',
    ],

    // --- CORS ----------------------------------------------------------
    // Origin frontend yang boleh memanggil API. '*' hanya untuk development.
    'cors_origins' => array_filter(array_map('trim', explode(
        ',',
        env_value('CORS_ORIGINS', 'http://localhost:8080,http://localhost:3000')
    ))),
];
