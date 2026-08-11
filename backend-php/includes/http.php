<?php
/**
 * Helper HTTP: CORS, parsing body, dan format respons JSON.
 *
 * Format respons sengaja dibuat identik dengan yang diharapkan frontend:
 *   sukses -> { "data": ..., "count": n|null, "error": null }
 *   gagal  -> { "data": null, "error": { "message": "...", "code": "..." } }
 */

declare(strict_types=1);

/** Kirim header CORS berdasarkan whitelist origin. */
function send_cors_headers(): void
{
    $config = app_config();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '' && (in_array('*', $config['cors_origins'], true) || in_array($origin, $config['cors_origins'], true))) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}

/** Baca body JSON request sebagai array. */
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/** Kirim respons sukses dan hentikan eksekusi. */
function json_ok(mixed $data, ?int $count = null, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    // Respons berbasis sesi tidak boleh di-cache bersama.
    header('Cache-Control: no-store');
    echo json_encode(
        ['data' => $data, 'count' => $count, 'error' => null],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

/** Kirim respons error dan hentikan eksekusi. */
function json_error(string $message, int $status = 400, string $code = ''): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(
        ['data' => null, 'count' => null, 'error' => ['message' => $message, 'code' => $code ?: (string) $status]],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

/** UUID v4 (untuk primary key CHAR(36)). */
function uuid_v4(): string
{
    $bytes    = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

/** Timestamp UTC dalam format MySQL DATETIME. */
function now_utc(): string
{
    return gmdate('Y-m-d H:i:s');
}

/** Ubah ISO-8601 dari frontend menjadi DATETIME MySQL (UTC). Null-safe. */
function to_mysql_datetime(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable((string) $value))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d H:i:s');
    } catch (Throwable) {
        return null;
    }
}

/** Ubah DATETIME MySQL menjadi ISO-8601 UTC seperti yang dipakai frontend. */
function to_iso8601(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    return str_replace(' ', 'T', $value) . '+00:00';
}

/** IP klien (mendukung proxy/CDN). */
function client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            return trim(explode(',', (string) $_SERVER[$key])[0]);
        }
    }
    return '';
}
