<?php
/**
 * JWT HS256 minimal — tanpa dependency eksternal.
 * Dipakai sebagai pengganti access token Supabase (GoTrue).
 */

declare(strict_types=1);

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return (string) base64_decode(strtr($data, '-_', '+/'), true);
}

/** Buat access token untuk user. */
function jwt_encode(array $claims): string
{
    $config  = app_config();
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
    $now     = time();
    $payload = base64url_encode(json_encode(array_merge($claims, [
        'iat' => $now,
        'exp' => $now + $config['jwt_ttl'],
    ]), JSON_THROW_ON_ERROR));

    $signature = base64url_encode(
        hash_hmac('sha256', $header . '.' . $payload, $config['jwt_secret'], true)
    );

    return $header . '.' . $payload . '.' . $signature;
}

/**
 * Verifikasi token. Mengembalikan array claims, atau null bila tidak valid.
 * Perbandingan signature memakai hash_equals (timing-safe).
 */
function jwt_decode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$header, $payload, $signature] = $parts;

    $config   = app_config();
    $expected = base64url_encode(
        hash_hmac('sha256', $header . '.' . $payload, $config['jwt_secret'], true)
    );
    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $claims = json_decode(base64url_decode($payload), true);
    if (!is_array($claims)) {
        return null;
    }
    if (isset($claims['exp']) && time() >= (int) $claims['exp']) {
        return null;
    }

    return $claims;
}
