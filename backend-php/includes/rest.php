<?php
/**
 * Handler untuk /rest/select, /rest/insert, /rest/update, /rest/delete.
 * Semua nilai selalu di-bind sebagai parameter (prepared statement).
 */

declare(strict_types=1);

function handle_rest_select(array $body): never
{
    $table = (string) ($body['table'] ?? '');
    $def   = table_def($table);

    $forced  = enforce_read_policy($table, $def);
    $filters = array_merge($forced, is_array($body['filters'] ?? null) ? $body['filters'] : []);

    [$columns, $relations] = parse_select($def, (string) ($body['select'] ?? '*'));
    [$where, $params]      = build_where($def, $filters);

    // --- ORDER BY (nama kolom divalidasi, arah dibatasi ASC/DESC) --------
    $orderSql = '';
    $orders   = [];
    foreach (is_array($body['order'] ?? null) ? $body['order'] : [] as $order) {
        $column    = assert_column($def, (string) ($order['column'] ?? ''));
        $direction = ($order['ascending'] ?? true) ? 'ASC' : 'DESC';
        // nullsFirst mengikuti perilaku PostgREST.
        $nulls     = array_key_exists('nullsFirst', $order)
            ? (($order['nullsFirst'] ? '' : '`' . $column . '` IS NULL, '))
            : '';
        $orders[]  = $nulls . "`{$column}` {$direction}";
    }
    if ($orders !== []) {
        $orderSql = ' ORDER BY ' . implode(', ', $orders);
    }

    // --- LIMIT / OFFSET (integer, tidak pernah string mentah) ------------
    $limitSql = '';
    if (isset($body['range']) && is_array($body['range'])) {
        $from     = max(0, (int) ($body['range'][0] ?? 0));
        $to       = max($from, (int) ($body['range'][1] ?? 0));
        $limitSql = sprintf(' LIMIT %d OFFSET %d', $to - $from + 1, $from);
    } elseif (isset($body['limit'])) {
        $limitSql = sprintf(' LIMIT %d', max(0, (int) $body['limit']));
    } elseif (!empty($body['single']) || !empty($body['maybeSingle'])) {
        $limitSql = ' LIMIT 2'; // 2 agar bisa mendeteksi "lebih dari satu baris"
    }

    // --- COUNT ------------------------------------------------------------
    $count = null;
    if (!empty($body['count'])) {
        $countStmt = db()->prepare("SELECT COUNT(*) FROM `{$table}`{$where}");
        $countStmt->execute($params);
        $count = (int) $countStmt->fetchColumn();
    }

    // head=true -> hanya butuh jumlah baris, tidak perlu datanya.
    if (!empty($body['head'])) {
        json_ok([], $count);
    }

    $sql  = 'SELECT `' . implode('`,`', $columns) . "` FROM `{$table}`{$where}{$orderSql}{$limitSql}";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    if ($relations !== []) {
        $rows = attach_relations($rows, $relations);
    }
    $rows = array_map(static fn(array $row): array => hydrate_row($def, $row), $rows);

    // .single() / .maybeSingle() mengembalikan objek, bukan array.
    if (!empty($body['single']) || !empty($body['maybeSingle'])) {
        if (count($rows) > 1) {
            json_error('Lebih dari satu baris ditemukan', 406, 'PGRST116');
        }
        if ($rows === []) {
            if (!empty($body['single'])) {
                json_error('Baris tidak ditemukan', 406, 'PGRST116');
            }
            json_ok(null, $count);
        }
        json_ok($rows[0], $count);
    }

    json_ok($rows, $count);
}

/** INSERT, dengan dukungan upsert (ON DUPLICATE KEY UPDATE). */
function handle_rest_insert(array $body): never
{
    $table  = (string) ($body['table'] ?? '');
    $def    = table_def($table);
    $userId = enforce_write_policy($table, $def);

    $rows = $body['rows'] ?? [];
    if (!is_array($rows) || $rows === []) {
        json_error('Tidak ada baris untuk disimpan', 400);
    }
    if (!isset($rows[0]) || !is_array($rows[0])) {
        $rows = [$rows];
    }

    $upsert   = !empty($body['upsert']);
    $inserted = [];

    $pdo = db();
    $pdo->beginTransaction();
    try {
        foreach ($rows as $row) {
            // Tabel "insert_self" (mis. activity_log) dipaksa memakai id pemanggil.
            if (($def['write'] ?? '') === 'insert_self' && isset($def['owner'])) {
                $row[$def['owner']] = $userId;
            }
            if (!isset($row['id']) && in_array('id', $def['columns'], true) && $table !== 'site_settings') {
                $row['id'] = uuid_v4();
            }

            $columns = [];
            $values  = [];
            foreach ($row as $column => $value) {
                assert_column($def, (string) $column);
                $columns[] = (string) $column;
                $values[]  = dehydrate_value($def, (string) $column, $value);
            }
            if ($columns === []) {
                continue;
            }

            $sql = 'INSERT INTO `' . $table . '` (`' . implode('`,`', $columns) . '`) VALUES ('
                 . implode(',', array_fill(0, count($columns), '?')) . ')';

            if ($upsert) {
                $updates = [];
                foreach ($columns as $column) {
                    if ($column === 'id') {
                        continue;
                    }
                    $updates[] = "`{$column}` = VALUES(`{$column}`)";
                }
                if ($updates !== []) {
                    $sql .= ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);
                }
            }

            $pdo->prepare($sql)->execute($values);
            $inserted[] = $row['id'] ?? null;
        }
        $pdo->commit();
    } catch (PDOException $exception) {
        $pdo->rollBack();
        // 23000 = pelanggaran constraint (duplikat / foreign key).
        if ($exception->getCode() === '23000') {
            json_error('Data duplikat atau relasi tidak valid: ' . $exception->getMessage(), 409, '23505');
        }
        throw $exception;
    }

    // Kembalikan baris hasil bila diminta (.select() setelah insert).
    if (!empty($body['returning'])) {
        $ids = array_values(array_filter($inserted));
        if ($ids !== []) {
            $stmt = $pdo->prepare(
                'SELECT `' . implode('`,`', readable_columns($def)) . "` FROM `{$table}`"
                . ' WHERE `id` IN (' . implode(',', array_fill(0, count($ids), '?')) . ')'
            );
            $stmt->execute($ids);
            $result = array_map(static fn(array $r): array => hydrate_row($def, $r), $stmt->fetchAll());
            json_ok(count($result) === 1 && !empty($body['single']) ? $result[0] : $result);
        }
    }

    json_ok(null);
}

/** UPDATE dengan filter wajib (tidak pernah update seluruh tabel). */
function handle_rest_update(array $body): never
{
    $table = (string) ($body['table'] ?? '');
    $def   = table_def($table);
    enforce_write_policy($table, $def);

    $values  = is_array($body['values'] ?? null) ? $body['values'] : [];
    $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    if ($values === []) {
        json_error('Tidak ada nilai untuk diperbarui', 400);
    }
    if ($filters === []) {
        json_error('UPDATE tanpa filter ditolak', 400, 'unsafe_update');
    }

    $sets   = [];
    $params = [];
    foreach ($values as $column => $value) {
        assert_column($def, (string) $column);
        $sets[]   = "`{$column}` = ?";
        $params[] = dehydrate_value($def, (string) $column, $value);
    }

    [$where, $whereParams] = build_where($def, $filters);
    $sql = "UPDATE `{$table}` SET " . implode(', ', $sets) . $where;

    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge($params, $whereParams));

    if (!empty($body['returning'])) {
        [$columns] = parse_select($def, (string) ($body['select'] ?? '*'));
        $selectStmt = db()->prepare('SELECT `' . implode('`,`', $columns) . "` FROM `{$table}`{$where}");
        $selectStmt->execute($whereParams);
        $rows = array_map(static fn(array $r): array => hydrate_row($def, $r), $selectStmt->fetchAll());
        json_ok(!empty($body['single']) ? ($rows[0] ?? null) : $rows);
    }

    json_ok(null);
}

/** DELETE dengan filter wajib. */
function handle_rest_delete(array $body): never
{
    $table = (string) ($body['table'] ?? '');
    $def   = table_def($table);
    enforce_write_policy($table, $def);

    $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    if ($filters === []) {
        json_error('DELETE tanpa filter ditolak', 400, 'unsafe_delete');
    }

    [$where, $params] = build_where($def, $filters);
    $stmt = db()->prepare("DELETE FROM `{$table}`{$where}");
    $stmt->execute($params);

    json_ok(null);
}
