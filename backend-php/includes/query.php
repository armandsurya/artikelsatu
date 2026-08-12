<?php
/**
 * Query builder aman untuk endpoint /rest/*.
 *
 * Frontend mengirim deskripsi query dalam bentuk JSON (bukan SQL), lalu
 * file ini menyusun SQL dengan:
 *   - nama tabel & kolom divalidasi terhadap whitelist (includes/schema.php)
 *   - SEMUA nilai dikirim sebagai parameter prepared statement
 * Sehingga SQL injection tidak mungkin terjadi.
 */

declare(strict_types=1);

/** Operator yang diizinkan -> operator SQL. */
const FILTER_OPS = [
    'eq'    => '=',
    'neq'   => '<>',
    'gt'    => '>',
    'gte'   => '>=',
    'lt'    => '<',
    'lte'   => '<=',
    'like'  => 'LIKE',
    'ilike' => 'LIKE', // MySQL collation utf8mb4_unicode_ci sudah case-insensitive
];

/**
 * Susun klausa WHERE dari daftar filter.
 * @return array{0:string,1:array} [sql, params]
 */
function build_where(array $def, array $filters): array
{
    $clauses = [];
    $params  = [];

    foreach ($filters as $filter) {
        $op     = (string) ($filter['op'] ?? '');
        $column = assert_column($def, (string) ($filter['column'] ?? ''));
        $value  = $filter['value'] ?? null;

        if (isset(FILTER_OPS[$op])) {
            $clauses[] = "`{$column}` " . FILTER_OPS[$op] . ' ?';
            $params[]  = dehydrate_value($def, $column, $value);
            continue;
        }

        switch ($op) {
            case 'is': // .is("deleted_at", null)
                $clauses[] = $value === null
                    ? "`{$column}` IS NULL"
                    : "`{$column}` = ?";
                if ($value !== null) {
                    $params[] = dehydrate_value($def, $column, $value);
                }
                break;

            case 'not_is':
                $clauses[] = "`{$column}` IS NOT NULL";
                break;

            case 'in':
                $list = is_array($value) ? array_values($value) : [];
                if ($list === []) {
                    $clauses[] = '1 = 0'; // IN () kosong -> tidak ada hasil
                    break;
                }
                $clauses[] = "`{$column}` IN (" . implode(',', array_fill(0, count($list), '?')) . ')';
                foreach ($list as $item) {
                    $params[] = dehydrate_value($def, $column, $item);
                }
                break;

            case 'neq_null':
                $clauses[] = "`{$column}` IS NOT NULL";
                break;

            default:
                json_error("Operator tidak didukung: {$op}", 400, 'unsupported_operator');
        }
    }

    return [$clauses === [] ? '' : ' WHERE ' . implode(' AND ', $clauses), $params];
}

/**
 * Tambahkan pembatasan keamanan baca (pengganti RLS).
 * Mengembalikan daftar filter tambahan yang dipaksakan server.
 */
function enforce_read_policy(string $table, array $def): array
{
    if (is_service_request()) {
        return []; // request internal server-to-server: tanpa pembatasan
    }
    $userId = current_user_id();
    $staff  = is_content_manager($userId);

    switch ($def['read']) {
        case 'public':
            return [];

        case 'public_published':
            // Pengunjung anonim/non-staf hanya boleh melihat konten terbit.
            if ($staff) {
                return [];
            }
            return [
                ['op' => 'eq', 'column' => 'status', 'value' => 'published'],
                ['op' => 'is', 'column' => 'deleted_at', 'value' => null],
            ];

        case 'staff':
            if (!$staff) {
                json_error('Unauthorized', $userId === null ? 401 : 403);
            }
            return [];

        case 'super_admin':
            if (!has_role($userId, 'super_admin')) {
                json_error('Unauthorized', $userId === null ? 401 : 403);
            }
            return [];

        case 'self':
            if ($userId === null) {
                json_error('Unauthorized', 401);
            }
            if (has_role($userId, 'super_admin') || $staff) {
                return [];
            }
            return [['op' => 'eq', 'column' => $def['owner'], 'value' => $userId]];
    }

    json_error("Kebijakan baca tidak dikenal untuk {$table}", 500);
}

/** Pastikan pemanggil boleh menulis ke tabel ini. */
function enforce_write_policy(string $table, array $def): string
{
    switch ($def['write']) {
        case 'content_manager':
            return require_content_manager();
        case 'super_admin':
            return require_super_admin();
        case 'self':
        case 'insert_self':
            $userId = current_user_id();
            if ($userId === null && is_service_request()) {
                return 'service';
            }
            if ($userId === null) {
                json_error('Unauthorized', 401);
            }
            return $userId;
    }
    json_error("Tabel {$table} bersifat read-only", 403);
}

/** Parse string select() menjadi daftar kolom + relasi tersemat. */
function parse_select(array $def, string $select): array
{
    $columns   = [];
    $relations = [];
    $allowed   = readable_columns($def);

    // Pecah berdasarkan koma di level teratas (abaikan koma di dalam kurung).
    $parts = [];
    $depth = 0;
    $buf   = '';
    foreach (str_split($select) as $char) {
        if ($char === '(') { $depth++; }
        if ($char === ')') { $depth--; }
        if ($char === ',' && $depth === 0) {
            $parts[] = trim($buf);
            $buf     = '';
            continue;
        }
        $buf .= $char;
    }
    if (trim($buf) !== '') {
        $parts[] = trim($buf);
    }

    foreach ($parts as $part) {
        if ($part === '' ) {
            continue;
        }
        if ($part === '*') {
            $columns = array_merge($columns, $allowed);
            continue;
        }
        // Relasi tersemat: blog_categories(name, slug)
        if (preg_match('/^([a-z_]+)\s*\(([^)]*)\)$/i', $part, $match)) {
            $relName = $match[1];
            $relDef  = $def['relations'][$relName] ?? null;
            if ($relDef === null) {
                json_error("Relasi tidak dikenal: {$relName}", 400, 'unknown_relation');
            }
            $relTable   = table_def($relDef['table']);
            $relColumns = array_values(array_filter(array_map('trim', explode(',', $match[2]))));
            foreach ($relColumns as $relColumn) {
                assert_column($relTable, $relColumn);
            }
            $relations[$relName] = $relDef + ['columns' => $relColumns];
            $columns[]           = $relDef['local']; // FK wajib ikut diambil
            continue;
        }
        if (!in_array($part, $allowed, true)) {
            json_error("Kolom tidak dapat dibaca: {$part}", 400, 'unknown_column');
        }
        $columns[] = $part;
    }

    if ($columns === []) {
        $columns = $allowed;
    }

    return [array_values(array_unique($columns)), $relations];
}

/** Ambil data relasi tersemat dan tempelkan ke baris hasil. */
function attach_relations(array $rows, array $relations): array
{
    foreach ($relations as $name => $relation) {
        $relDef = table_def($relation['table']);
        $keys   = array_values(array_unique(array_filter(array_column($rows, $relation['local']))));
        $map    = [];

        if ($keys !== []) {
            $cols = array_unique(array_merge($relation['columns'], [$relation['foreign']]));
            $sql  = 'SELECT `' . implode('`,`', $cols) . '` FROM `' . $relation['table'] . '`'
                  . ' WHERE `' . $relation['foreign'] . '` IN (' . implode(',', array_fill(0, count($keys), '?')) . ')';
            $stmt = db()->prepare($sql);
            $stmt->execute($keys);
            foreach ($stmt->fetchAll() as $relRow) {
                $hydrated = hydrate_row($relDef, $relRow);
                $map[$relRow[$relation['foreign']]] = array_intersect_key(
                    $hydrated,
                    array_flip($relation['columns'])
                );
            }
        }

        foreach ($rows as $index => $row) {
            $rows[$index][$name] = $map[$row[$relation['local']] ?? ''] ?? null;
        }
    }
    return $rows;
}
