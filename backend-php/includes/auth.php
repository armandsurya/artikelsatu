<?php
/**
 * Autentikasi & otorisasi.
 *
 * Menggantikan Supabase Auth + Row Level Security:
 *  - identitas  -> JWT bearer token (includes/jwt.php)
 *  - otorisasi  -> pengecekan peran di PHP (has_role / is_content_manager)
 */

declare(strict_types=1);

/** Baca bearer token dari header Authorization. */
function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (stripos($header, 'Bearer ') !== 0) {
        return null;
    }
    $token = trim(substr($header, 7));
    return $token !== '' ? $token : null;
}

/**
 * User yang sedang login, atau null bila anonim.
 * Bentuknya menyerupai objek user Supabase agar frontend tidak perlu diubah.
 */
function current_user(): ?array
{
    static $cached = false;
    static $user   = null;
    if ($cached) {
        return $user;
    }
    $cached = true;

    $token = bearer_token();
    if ($token === null) {
        return null;
    }
    $claims = jwt_decode($token);
    if ($claims === null || empty($claims['sub'])) {
        return null;
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$claims['sub']]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    // Akun yang di-ban tidak dianggap login.
    if ($row['banned_until'] !== null && $row['banned_until'] > now_utc()) {
        return null;
    }

    $user = format_user($row);
    return $user;
}

/** Bentuk objek user seperti respons Supabase Auth. */
function format_user(array $row): array
{
    return [
        'id'                 => $row['id'],
        'email'              => $row['email'],
        'user_metadata'      => json_decode((string) ($row['user_metadata'] ?? '{}'), true) ?: [],
        'created_at'         => to_iso8601($row['created_at']),
        'updated_at'         => to_iso8601($row['updated_at']),
        'last_sign_in_at'    => to_iso8601($row['last_sign_in_at']),
        'email_confirmed_at' => to_iso8601($row['email_confirmed_at']),
        'banned_until'       => to_iso8601($row['banned_until']),
        'role'               => 'authenticated',
        'aud'                => 'authenticated',
    ];
}

/**
 * Request internal server-to-server (SSR / server function) yang membawa
 * X-Service-Token yang cocok dengan konfigurasi. Setara service role.
 */
function is_service_request(): bool
{
    $expected = app_config()['service_token'] ?? '';
    if ($expected === '') {
        return false;
    }
    $given = $_SERVER['HTTP_X_SERVICE_TOKEN'] ?? '';
    return $given !== '' && hash_equals((string) $expected, (string) $given);
}

/** ID user login atau null. */
function current_user_id(): ?string
{
    $user = current_user();
    return $user['id'] ?? null;
}

/** Daftar peran user (dari tabel user_roles). */
function user_roles(?string $userId): array
{
    if ($userId === null) {
        return [];
    }
    static $cache = [];
    if (isset($cache[$userId])) {
        return $cache[$userId];
    }
    $stmt = db()->prepare('SELECT role FROM user_roles WHERE user_id = ?');
    $stmt->execute([$userId]);
    $cache[$userId] = array_column($stmt->fetchAll(), 'role');
    return $cache[$userId];
}

/** Padanan fungsi SQL has_role(). */
function has_role(?string $userId, string $role): bool
{
    if (is_service_request()) {
        return true;
    }
    return in_array($role, user_roles($userId), true);
}

/** Padanan fungsi SQL has_any_role(). */
function has_any_role(?string $userId): bool
{
    if (is_service_request()) {
        return true;
    }
    return user_roles($userId) !== [];
}

/** Padanan is_content_manager(): peran yang boleh mengelola konten CMS. */
function is_content_manager(?string $userId): bool
{
    if (is_service_request()) {
        return true;
    }
    return array_intersect(['super_admin', 'editor', 'author'], user_roles($userId)) !== [];
}

/** Padanan has_permission(): super_admin selalu diizinkan. */
function has_permission(?string $userId, string $permission): bool
{
    if ($userId === null) {
        return false;
    }
    if (has_role($userId, 'super_admin')) {
        return true;
    }
    $roles = user_roles($userId);
    if ($roles === []) {
        return false;
    }
    $placeholders = implode(',', array_fill(0, count($roles), '?'));
    $stmt = db()->prepare(
        "SELECT 1 FROM role_permissions
          WHERE permission = ? AND allowed = 1 AND role IN ($placeholders) LIMIT 1"
    );
    $stmt->execute(array_merge([$permission], $roles));
    return (bool) $stmt->fetchColumn();
}

/** Hentikan request bila bukan content manager. */
function require_content_manager(): string
{
    $userId = current_user_id();
    if ($userId === null && is_service_request()) {
        return 'service';
    }
    if ($userId === null) {
        json_error('Unauthorized', 401);
    }
    if (!is_content_manager($userId)) {
        json_error('Forbidden: memerlukan peran pengelola konten', 403);
    }
    return $userId;
}

/** Hentikan request bila bukan super admin. */
function require_super_admin(): string
{
    $userId = current_user_id();
    if ($userId === null && is_service_request()) {
        return 'service';
    }
    if ($userId === null) {
        json_error('Unauthorized', 401);
    }
    if (!has_role($userId, 'super_admin')) {
        json_error('Forbidden: memerlukan peran super admin', 403);
    }
    return $userId;
}
