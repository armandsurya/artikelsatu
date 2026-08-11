<?php
/**
 * Front controller backend PHP.
 * Semua permintaan API masuk lewat file ini (lihat .htaccess).
 */

declare(strict_types=1);

require __DIR__ . '/config/config.php';
require __DIR__ . '/config/database.php';
require __DIR__ . '/includes/http.php';
require __DIR__ . '/includes/jwt.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/schema.php';
require __DIR__ . '/includes/query.php';
require __DIR__ . '/includes/rest.php';
require __DIR__ . '/includes/rpc.php';
require __DIR__ . '/includes/storage.php';
require __DIR__ . '/includes/auth_endpoints.php';

send_cors_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Ambil path relatif terhadap /api.
$path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
$path = '/' . trim(preg_replace('#^.*?/api#', '', $path) ?: '', '/');

$isMultipart = str_contains((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data');
$body        = $isMultipart ? [] : read_json_body();

try {
    switch (true) {
        case $path === '/health':
            json_ok(['status' => 'ok', 'time' => now_utc()]);

        case $path === '/auth/login':
            handle_auth_login($body);
        case $path === '/auth/register':
            handle_auth_register($body);
        case $path === '/auth/user':
            handle_auth_user();
        case $path === '/auth/refresh':
            handle_auth_refresh($body);
        case $path === '/auth/logout':
            handle_auth_logout($body);

        case $path === '/rest/select':
            handle_rest_select($body);
        case $path === '/rest/insert':
            handle_rest_insert($body);
        case $path === '/rest/update':
            handle_rest_update($body);
        case $path === '/rest/delete':
            handle_rest_delete($body);

        case str_starts_with($path, '/rpc/'):
            handle_rpc(substr($path, 5), is_array($body['args'] ?? null) ? $body['args'] : $body);

        case $path === '/storage/upload':
            handle_storage_upload();
        case $path === '/storage/remove':
            handle_storage_remove($body);
        case $path === '/storage/sign':
            handle_storage_sign($body);
    }

    json_error('Endpoint tidak ditemukan', 404, 'not_found');
} catch (Throwable $exception) {
    // Detail teknis hanya dicatat di log server, tidak dikirim ke browser.
    error_log('[api] ' . $exception->getMessage() . ' @ ' . $exception->getFile() . ':' . $exception->getLine());
    json_error(
        app_config()['debug'] ? $exception->getMessage() : 'Terjadi kesalahan pada server',
        500,
        'internal_error'
    );
}
