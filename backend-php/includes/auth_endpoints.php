<?php
/**
 * Endpoint autentikasi — pengganti Supabase Auth.
 *
 *   POST /auth/login    { email, password }
 *   POST /auth/register { email, password, full_name }
 *   GET  /auth/user
 *   POST /auth/refresh  { refresh_token }
 *   POST /auth/logout
 */

declare(strict_types=1);

/** Bentuk respons sesi, mengikuti struktur yang dipakai frontend. */
function build_session(array $userRow, string $refreshToken): array
{
    $config = app_config();
    $user   = format_user($userRow);

    return [
        'access_token'  => jwt_encode(['sub' => $userRow['id'], 'email' => $userRow['email'], 'role' => 'authenticated']),
        'refresh_token' => $refreshToken,
        'token_type'    => 'bearer',
        'expires_in'    => $config['jwt_ttl'],
        'expires_at'    => time() + $config['jwt_ttl'],
        'user'          => $user,
    ];
}

/** Buat baris sesi baru (refresh token). */
function create_session(string $userId): string
{
    $config       = app_config();
    $refreshToken = bin2hex(random_bytes(32));

    $stmt = db()->prepare(
        'INSERT INTO auth_sessions (id, user_id, refresh_token, user_agent, ip, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        uuid_v4(),
        $userId,
        $refreshToken,
        substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
        client_ip(),
        gmdate('Y-m-d H:i:s', time() + $config['refresh_ttl']),
    ]);

    return $refreshToken;
}

function handle_auth_login(array $body): never
{
    $email    = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        json_error('Email dan password wajib diisi', 400);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    // Pesan error sengaja disamakan agar tidak membocorkan email terdaftar.
    if (!$row || !password_verify($password, $row['password_hash'])) {
        json_error('Email atau password salah', 400, 'invalid_credentials');
    }
    if ($row['banned_until'] !== null && $row['banned_until'] > now_utc()) {
        json_error('Akun dinonaktifkan', 403, 'user_banned');
    }

    db()->prepare('UPDATE users SET last_sign_in_at = ? WHERE id = ?')
        ->execute([now_utc(), $row['id']]);
    $row['last_sign_in_at'] = now_utc();

    json_ok(build_session($row, create_session($row['id'])));
}

function handle_auth_register(array $body): never
{
    $config = app_config();
    if (!$config['allow_signup']) {
        json_error('Pendaftaran mandiri dinonaktifkan', 403);
    }

    $email    = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $fullName = trim((string) ($body['full_name'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Email tidak valid', 400);
    }
    if (strlen($password) < 8) {
        json_error('Password minimal 8 karakter', 400);
    }

    $exists = db()->prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1');
    $exists->execute([$email]);
    if ($exists->fetchColumn()) {
        json_error('Email sudah terdaftar', 409, 'user_already_exists');
    }

    $userId = create_user_record($email, $password, $fullName ?: null);

    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    json_ok(build_session($stmt->fetch(), create_session($userId)));
}

/**
 * Membuat user + profil + peran awal.
 * Meniru trigger handle_new_user(): pengguna PERTAMA otomatis super_admin.
 */
function create_user_record(string $email, string $password, ?string $fullName, bool $confirmed = true): string
{
    $pdo    = db();
    $userId = uuid_v4();

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, user_metadata, email_confirmed_at)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $userId,
            $email,
            password_hash($password, PASSWORD_DEFAULT),
            json_encode($fullName !== null ? ['full_name' => $fullName] : [], JSON_UNESCAPED_UNICODE),
            $confirmed ? now_utc() : null,
        ]);

        $pdo->prepare('INSERT INTO profiles (id, full_name) VALUES (?, ?)')
            ->execute([$userId, $fullName ?: explode('@', $email)[0]]);

        $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM user_roles WHERE role = 'super_admin'")->fetchColumn();
        if ($adminCount === 0) {
            $pdo->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')
                ->execute([uuid_v4(), $userId, 'super_admin']);
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }

    return $userId;
}

function handle_auth_user(): never
{
    $user = current_user();
    if ($user === null) {
        json_error('Unauthorized', 401);
    }
    json_ok(['user' => $user]);
}

function handle_auth_refresh(array $body): never
{
    $token = (string) ($body['refresh_token'] ?? '');
    if ($token === '') {
        json_error('refresh_token wajib diisi', 400);
    }

    $stmt = db()->prepare(
        'SELECT u.* FROM auth_sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.refresh_token = ? AND s.expires_at > ? LIMIT 1'
    );
    $stmt->execute([$token, now_utc()]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Sesi tidak valid atau kedaluwarsa', 401, 'invalid_refresh_token');
    }

    // Rotasi refresh token setiap kali dipakai.
    db()->prepare('DELETE FROM auth_sessions WHERE refresh_token = ?')->execute([$token]);
    json_ok(build_session($row, create_session($row['id'])));
}

function handle_auth_logout(array $body): never
{
    $token = (string) ($body['refresh_token'] ?? '');
    if ($token !== '') {
        db()->prepare('DELETE FROM auth_sessions WHERE refresh_token = ?')->execute([$token]);
    } elseif (($userId = current_user_id()) !== null) {
        db()->prepare('DELETE FROM auth_sessions WHERE user_id = ?')->execute([$userId]);
    }
    json_ok(null);
}
