<?php
/**
 * RPC — padanan fungsi SQL SECURITY DEFINER milik Supabase.
 * Setiap fungsi diimplementasikan eksplisit di sini (tidak ada eval SQL dinamis).
 */

declare(strict_types=1);

/** Hapus kunci sensitif/draft dari JSON pengaturan publik. */
function sanitize_public_settings(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }
    $result = [];
    foreach ($value as $key => $item) {
        $lower = strtolower((string) $key);
        $blocked = $lower === 'draft'
            || str_ends_with($lower, '_draft')
            || str_contains($lower, 'secret')
            || str_contains($lower, 'token')
            || str_contains($lower, 'password')
            || str_contains($lower, 'apikey')
            || str_contains($lower, 'api_key')
            || str_contains($lower, 'private');
        if ($blocked) {
            continue;
        }
        $result[$key] = is_array($item) ? sanitize_public_settings($item) : $item;
    }
    return $result;
}

function handle_rpc(string $name, array $args): never
{
    switch ($name) {
        // Pengaturan situs versi publik (draft & kunci rahasia dibuang).
        case 'get_public_site_settings': {
            $stmt = db()->query('SELECT `data` FROM site_settings ORDER BY id LIMIT 1');
            $raw  = $stmt->fetchColumn();
            $data = $raw === false ? [] : (json_decode((string) $raw, true) ?: []);
            json_ok(sanitize_public_settings($data));
        }

        // Nama penulis untuk artikel yang SUDAH terbit saja.
        case 'get_public_author_names': {
            $ids = is_array($args['_ids'] ?? null) ? array_values(array_filter($args['_ids'])) : [];
            if ($ids === []) {
                json_ok([]);
            }
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmt = db()->prepare(
                "SELECT p.id, p.full_name
                   FROM profiles p
                  WHERE p.id IN ($placeholders)
                    AND EXISTS (
                        SELECT 1 FROM blog_posts b
                         WHERE b.author_id = p.id
                           AND b.status = 'published'
                           AND b.deleted_at IS NULL
                    )"
            );
            $stmt->execute($ids);
            json_ok($stmt->fetchAll());
        }

        // Pengecekan peran (dipakai server function admin).
        case 'has_role': {
            $userId = (string) ($args['_user_id'] ?? '');
            $role   = (string) ($args['_role'] ?? '');
            // Hanya boleh menanyakan peran diri sendiri, kecuali super admin.
            $me = current_user_id();
            if ($me === null) {
                json_error('Unauthorized', 401);
            }
            if ($userId !== $me && !has_role($me, 'super_admin')) {
                json_error('Forbidden', 403);
            }
            json_ok(has_role($userId, $role));
        }

        case 'has_any_role': {
            $me = current_user_id();
            if ($me === null) {
                json_error('Unauthorized', 401);
            }
            json_ok(has_any_role((string) ($args['_user_id'] ?? $me)));
        }

        case 'has_permission': {
            $me = current_user_id();
            if ($me === null) {
                json_error('Unauthorized', 401);
            }
            $userId = (string) ($args['_user_id'] ?? $me);
            if ($userId !== $me && !has_role($me, 'super_admin')) {
                json_error('Forbidden', 403);
            }
            json_ok(has_permission($userId, (string) ($args['_permission'] ?? '')));
        }


        // ---------------------------------------------------------------
        // Manajemen pengguna (hanya super admin / request internal).
        // ---------------------------------------------------------------
        case 'admin_list_users': {
            require_super_admin();
            $stmt = db()->query(
                'SELECT id, email, user_metadata, created_at, last_sign_in_at,
                        email_confirmed_at, banned_until
                   FROM users ORDER BY created_at DESC LIMIT 200'
            );
            $users = array_map(static function (array $row): array {
                $row['user_metadata'] = json_decode((string) ($row['user_metadata'] ?? '{}'), true) ?: [];
                foreach (['created_at', 'last_sign_in_at', 'email_confirmed_at', 'banned_until'] as $field) {
                    $row[$field] = to_iso8601($row[$field]);
                }
                return $row;
            }, $stmt->fetchAll());
            json_ok($users);
        }

        case 'admin_create_user': {
            require_super_admin();
            $email    = strtolower(trim((string) ($args['_email'] ?? '')));
            $password = (string) ($args['_password'] ?? '');
            $fullName = trim((string) ($args['_full_name'] ?? ''));
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
            json_ok(['id' => create_user_record($email, $password, $fullName ?: null)]);
        }

        case 'admin_delete_user': {
            require_super_admin();
            $id = (string) ($args['_user_id'] ?? '');
            db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            json_ok(true);
        }

        case 'admin_set_ban': {
            require_super_admin();
            $id  = (string) ($args['_user_id'] ?? '');
            $ban = !empty($args['_ban']);
            db()->prepare('UPDATE users SET banned_until = ? WHERE id = ?')
                ->execute([$ban ? gmdate('Y-m-d H:i:s', time() + 100 * 365 * 86400) : null, $id]);
            if ($ban) {
                db()->prepare('DELETE FROM auth_sessions WHERE user_id = ?')->execute([$id]);
            }
            json_ok(true);
        }

        case 'admin_set_password': {
            require_super_admin();
            $id       = (string) ($args['_user_id'] ?? '');
            $password = (string) ($args['_password'] ?? '');
            if (strlen($password) < 8) {
                json_error('Password minimal 8 karakter', 400);
            }
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
            // Paksa login ulang di semua perangkat.
            db()->prepare('DELETE FROM auth_sessions WHERE user_id = ?')->execute([$id]);
            json_ok(true);
        }

        // Statistik klik redirect (boleh dipanggil publik, hanya menaikkan counter).
        case 'increment_redirect_hit': {
            $stmt = db()->prepare(
                'UPDATE redirects SET hits = hits + 1, last_hit_at = ? WHERE LOWER(source) = LOWER(?)'
            );
            $stmt->execute([now_utc(), (string) ($args['_source'] ?? '')]);
            json_ok(null);
        }

        // Cron: terbitkan artikel terjadwal yang waktunya sudah lewat.
        case 'publish_due_scheduled_posts': {
            $now  = now_utc();
            $stmt = db()->prepare(
                "UPDATE blog_posts
                    SET status = 'published',
                        published_at = COALESCE(published_at, scheduled_at, ?),
                        updated_at = ?
                  WHERE status = 'scheduled'
                    AND scheduled_at IS NOT NULL
                    AND scheduled_at <= ?
                    AND deleted_at IS NULL"
            );
            $stmt->execute([$now, $now, $now]);
            json_ok($stmt->rowCount());
        }
    }

    json_error("Fungsi tidak dikenal: {$name}", 404, 'unknown_function');
}
