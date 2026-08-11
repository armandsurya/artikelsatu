<?php
/**
 * Definisi skema yang boleh diakses lewat API.
 *
 * Ini adalah lapisan keamanan utama pengganti Row Level Security:
 *  - hanya tabel & kolom yang terdaftar di sini yang bisa disentuh API
 *  - setiap tabel punya aturan baca (`read`) dan tulis (`write`)
 *
 * Aturan baca:
 *   public            -> siapa saja
 *   public_published  -> anonim hanya melihat baris terbit; staf melihat semua
 *   staff             -> hanya pengelola konten
 *   super_admin       -> hanya super admin
 *   self              -> hanya baris milik sendiri (atau staf)
 *
 * Aturan tulis:
 *   content_manager | super_admin | insert_self | none
 */

declare(strict_types=1);

const API_SCHEMA = [
    'profiles' => [
        'columns' => ['id', 'full_name', 'avatar_url', 'created_at', 'updated_at'],
        'read'    => 'self',
        'write'   => 'self',
        'owner'   => 'id',
    ],
    'user_roles' => [
        'columns' => ['id', 'user_id', 'role', 'created_at'],
        'read'    => 'self',
        'write'   => 'super_admin',
        'owner'   => 'user_id',
    ],
    'role_permissions' => [
        'columns' => ['id', 'role', 'permission', 'allowed', 'created_at', 'updated_at'],
        'read'    => 'staff',
        'write'   => 'super_admin',
        'bools'   => ['allowed'],
    ],
    'site_settings' => [
        'columns' => ['id', 'data', 'updated_at'],
        'json'    => ['data'],
        'read'    => 'staff',
        'write'   => 'super_admin',
    ],
    'blog_categories' => [
        'columns' => ['id', 'name', 'slug', 'description', 'created_at', 'updated_at'],
        'read'    => 'public',
        'write'   => 'content_manager',
    ],
    'blog_posts' => [
        'columns' => [
            'id', 'title', 'slug', 'excerpt', 'content', 'featured_image', 'category_id',
            'meta_title', 'meta_description', 'canonical_url', 'tags', 'focus_keywords',
            'author_id', 'last_editor_id', 'status', 'read_time', 'seo_score', 'seo_report',
            'published_at', 'scheduled_at', 'deleted_at', 'created_at', 'updated_at',
        ],
        'json'      => ['tags', 'focus_keywords', 'seo_report'],
        'dates'     => ['published_at', 'scheduled_at', 'deleted_at', 'created_at', 'updated_at'],
        'read'      => 'public_published',
        'write'     => 'content_manager',
        'relations' => [
            // select("*, blog_categories(name)")
            'blog_categories' => ['table' => 'blog_categories', 'local' => 'category_id', 'foreign' => 'id'],
        ],
    ],
    'blog_post_revisions' => [
        'columns' => [
            'id', 'post_id', 'revision_number', 'title', 'slug', 'excerpt', 'content',
            'featured_image', 'meta_title', 'meta_description', 'canonical_url', 'tags',
            'focus_keywords', 'category_id', 'status', 'seo_score', 'reason', 'author_id', 'created_at',
        ],
        'json'  => ['tags', 'focus_keywords'],
        'dates' => ['created_at'],
        'read'  => 'staff',
        'write' => 'content_manager',
    ],
    'homepage_sections' => [
        'columns' => [
            'id', 'section_key', 'title', 'is_visible', 'sort_order', 'data', 'draft_data',
            'status', 'last_published_at', 'last_saved_at', 'last_saved_by', 'updated_at',
        ],
        'json'  => ['data', 'draft_data'],
        'bools' => ['is_visible'],
        'dates' => ['last_published_at', 'last_saved_at', 'updated_at'],
        'read'  => 'public',
        // Kolom draft/internal tidak boleh terbaca pengunjung anonim.
        'public_columns' => ['id', 'section_key', 'title', 'is_visible', 'sort_order', 'data', 'updated_at', 'last_published_at'],
        'write' => 'content_manager',
    ],
    'homepage_section_versions' => [
        'columns' => ['id', 'section_key', 'version', 'title', 'data', 'note', 'created_by', 'created_at'],
        'json'    => ['data'],
        'dates'   => ['created_at'],
        'read'    => 'staff',
        'write'   => 'content_manager',
    ],
    'media' => [
        'columns' => [
            'id', 'name', 'path', 'url', 'mime_type', 'size_bytes', 'uploaded_by', 'alt',
            'title', 'caption', 'description', 'width', 'height', 'created_at', 'updated_at',
        ],
        'dates' => ['created_at', 'updated_at'],
        'read'  => 'staff',
        'write' => 'content_manager',
    ],
    'media_usage' => [
        'columns' => ['id', 'media_id', 'context', 'context_id', 'field', 'created_at'],
        'dates'   => ['created_at'],
        'read'    => 'staff',
        'write'   => 'content_manager',
    ],
    'menu_items' => [
        'columns' => ['id', 'location', 'label', 'href', 'sort_order', 'group_name', 'created_at'],
        'read'    => 'public',
        'write'   => 'content_manager',
    ],
    'redirects' => [
        'columns' => [
            'id', 'source', 'destination', 'code', 'active', 'preserve_query',
            'hits', 'last_hit_at', 'notes', 'created_at', 'updated_at',
        ],
        'bools' => ['active', 'preserve_query'],
        'dates' => ['last_hit_at', 'created_at', 'updated_at'],
        'read'  => 'public',
        'write' => 'content_manager',
    ],
    'ip_lists' => [
        'columns' => ['id', 'ip', 'list_type', 'note', 'created_at'],
        'read'    => 'super_admin',
        'write'   => 'super_admin',
    ],
    'activity_log' => [
        'columns' => ['id', 'user_id', 'action', 'entity', 'entity_id', 'ip', 'meta', 'created_at'],
        'json'    => ['meta'],
        'dates'   => ['created_at'],
        'read'    => 'staff',
        'write'   => 'insert_self',
        'owner'   => 'user_id',
    ],
];

/** Ambil definisi tabel atau hentikan request bila tidak dikenal. */
function table_def(string $table): array
{
    if (!isset(API_SCHEMA[$table])) {
        json_error("Tabel tidak dikenal: {$table}", 404, 'unknown_table');
    }
    return API_SCHEMA[$table];
}

/** Validasi nama kolom terhadap whitelist. */
function assert_column(array $def, string $column): string
{
    if (!in_array($column, $def['columns'], true)) {
        json_error("Kolom tidak dikenal: {$column}", 400, 'unknown_column');
    }
    return $column;
}

/**
 * Kolom yang boleh dibaca oleh pemanggil saat ini.
 * Untuk tabel dengan `public_columns`, anonim hanya mendapat subset itu.
 */
function readable_columns(array $def): array
{
    if (isset($def['public_columns']) && !is_content_manager(current_user_id())) {
        return $def['public_columns'];
    }
    return $def['columns'];
}

/** Ubah nilai baris dari MySQL ke bentuk yang diharapkan frontend. */
function hydrate_row(array $def, array $row): array
{
    foreach ($row as $key => $value) {
        if (in_array($key, $def['json'] ?? [], true)) {
            $row[$key] = $value === null ? null : json_decode((string) $value, true);
        } elseif (in_array($key, $def['bools'] ?? [], true)) {
            $row[$key] = $value === null ? null : (bool) $value;
        } elseif (in_array($key, $def['dates'] ?? [], true)) {
            $row[$key] = to_iso8601($value === null ? null : (string) $value);
        }
    }
    return $row;
}

/** Ubah nilai dari frontend ke bentuk yang bisa disimpan MySQL. */
function dehydrate_value(array $def, string $column, mixed $value): mixed
{
    if (in_array($column, $def['json'] ?? [], true)) {
        return $value === null ? null : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    if (in_array($column, $def['bools'] ?? [], true)) {
        return $value === null ? null : (int) (bool) $value;
    }
    if (in_array($column, $def['dates'] ?? [], true)) {
        return to_mysql_datetime($value);
    }
    if (is_array($value)) {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    if (is_bool($value)) {
        return (int) $value;
    }
    return $value;
}
