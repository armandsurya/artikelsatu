-- =====================================================================
--  ArtikelPro CMS — MySQL 8.0 schema
--  Migrasi 1:1 dari struktur PostgreSQL/Supabase sebelumnya.
--
--  Catatan pemetaan tipe:
--    uuid        -> CHAR(36)            (UUID v4 sebagai string)
--    timestamptz -> DATETIME            (SELALU disimpan dalam UTC)
--    jsonb       -> JSON
--    text[]      -> JSON  (array of string)
--    enum        -> ENUM
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `artikelpro`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE `artikelpro`;

-- Urutan drop mengikuti dependensi foreign key.
DROP TABLE IF EXISTS `media_usage`;
DROP TABLE IF EXISTS `blog_post_revisions`;
DROP TABLE IF EXISTS `activity_log`;
DROP TABLE IF EXISTS `homepage_section_versions`;
DROP TABLE IF EXISTS `homepage_sections`;
DROP TABLE IF EXISTS `blog_posts`;
DROP TABLE IF EXISTS `blog_categories`;
DROP TABLE IF EXISTS `media`;
DROP TABLE IF EXISTS `menu_items`;
DROP TABLE IF EXISTS `redirects`;
DROP TABLE IF EXISTS `ip_lists`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `site_settings`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `profiles`;
DROP TABLE IF EXISTS `auth_sessions`;
DROP TABLE IF EXISTS `users`;

-- ---------------------------------------------------------------------
-- users — pengganti tabel `auth.users` milik Supabase.
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id`                 CHAR(36)     NOT NULL,
  `email`              VARCHAR(255) NOT NULL,
  `password_hash`      VARCHAR(255) NOT NULL,
  `user_metadata`      JSON         NOT NULL,
  `email_confirmed_at` DATETIME     NULL,
  `last_sign_in_at`    DATETIME     NULL,
  `banned_until`       DATETIME     NULL,
  `recovery_token`     VARCHAR(64)  NULL,
  `recovery_sent_at`   DATETIME     NULL,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- auth_sessions — refresh token / revokasi sesi (pengganti GoTrue).
-- ---------------------------------------------------------------------
CREATE TABLE `auth_sessions` (
  `id`            CHAR(36)     NOT NULL,
  `user_id`       CHAR(36)     NOT NULL,
  `refresh_token` VARCHAR(128) NOT NULL,
  `user_agent`    VARCHAR(255) NULL,
  `ip`            VARCHAR(64)  NULL,
  `expires_at`    DATETIME     NOT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_refresh` (`refresh_token`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- profiles — data publik pengguna (1:1 dengan users).
-- ---------------------------------------------------------------------
CREATE TABLE `profiles` (
  `id`         CHAR(36)     NOT NULL,
  `full_name`  VARCHAR(255) NULL,
  `avatar_url` TEXT         NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_profiles_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- user_roles — peran disimpan TERPISAH dari profil (anti privilege escalation).
-- ---------------------------------------------------------------------
CREATE TABLE `user_roles` (
  `id`         CHAR(36) NOT NULL,
  `user_id`    CHAR(36) NOT NULL,
  `role`       ENUM('super_admin','editor','author') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role` (`user_id`, `role`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- role_permissions — matriks izin per peran.
-- ---------------------------------------------------------------------
CREATE TABLE `role_permissions` (
  `id`         CHAR(36)     NOT NULL,
  `role`       ENUM('super_admin','editor','author') NOT NULL,
  `permission` VARCHAR(128) NOT NULL,
  `allowed`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permission` (`role`, `permission`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- site_settings — satu baris JSON global (id selalu 1).
-- ---------------------------------------------------------------------
CREATE TABLE `site_settings` (
  `id`         INT      NOT NULL DEFAULT 1,
  `data`       JSON     NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- media — Digital Asset Management (file fisik ada di /uploads).
-- ---------------------------------------------------------------------
CREATE TABLE `media` (
  `id`          CHAR(36)     NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `path`        VARCHAR(512) NOT NULL,
  `url`         TEXT         NOT NULL,
  `mime_type`   VARCHAR(128) NULL,
  `size_bytes`  BIGINT       NULL,
  `uploaded_by` CHAR(36)     NULL,
  `alt`         VARCHAR(512) NULL,
  `title`       VARCHAR(255) NULL,
  `caption`     TEXT         NULL,
  `description` TEXT         NULL,
  `width`       INT          NULL,
  `height`      INT          NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_media_path` (`path`),
  KEY `idx_media_created` (`created_at`),
  CONSTRAINT `fk_media_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- blog_categories
-- ---------------------------------------------------------------------
CREATE TABLE `blog_categories` (
  `id`          CHAR(36)     NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `slug`        VARCHAR(255) NOT NULL,
  `description` TEXT         NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------
CREATE TABLE `blog_posts` (
  `id`               CHAR(36)     NOT NULL,
  `title`            VARCHAR(512) NOT NULL,
  `slug`             VARCHAR(255) NOT NULL,
  `excerpt`          TEXT         NULL,
  `content`          LONGTEXT     NULL,
  `featured_image`   TEXT         NULL,
  `category_id`      CHAR(36)     NULL,
  `meta_title`       VARCHAR(512) NULL,
  `meta_description` TEXT         NULL,
  `canonical_url`    TEXT         NULL,
  `tags`             JSON         NOT NULL,
  `focus_keywords`   JSON         NOT NULL,
  `author_id`        CHAR(36)     NULL,
  `last_editor_id`   CHAR(36)     NULL,
  `status`           ENUM('draft','published','scheduled','archived') NOT NULL DEFAULT 'draft',
  `read_time`        INT          NOT NULL DEFAULT 5,
  `seo_score`        INT          NULL,
  `seo_report`       JSON         NULL,
  `published_at`     DATETIME     NULL,
  `scheduled_at`     DATETIME     NULL,
  `deleted_at`       DATETIME     NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_slug` (`slug`),
  KEY `idx_posts_public` (`status`, `deleted_at`, `published_at`),
  KEY `idx_posts_category` (`category_id`),
  KEY `idx_posts_author` (`author_id`),
  CONSTRAINT `fk_posts_category`  FOREIGN KEY (`category_id`)    REFERENCES `blog_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posts_author`    FOREIGN KEY (`author_id`)      REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posts_editor`    FOREIGN KEY (`last_editor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- blog_post_revisions — riwayat versi artikel (dipangkas otomatis ke 50).
-- ---------------------------------------------------------------------
CREATE TABLE `blog_post_revisions` (
  `id`               CHAR(36)     NOT NULL,
  `post_id`          CHAR(36)     NOT NULL,
  `revision_number`  INT          NOT NULL,
  `title`            VARCHAR(512) NULL,
  `slug`             VARCHAR(255) NULL,
  `excerpt`          TEXT         NULL,
  `content`          LONGTEXT     NULL,
  `featured_image`   TEXT         NULL,
  `meta_title`       VARCHAR(512) NULL,
  `meta_description` TEXT         NULL,
  `canonical_url`    TEXT         NULL,
  `tags`             JSON         NOT NULL,
  `focus_keywords`   JSON         NOT NULL,
  `category_id`      CHAR(36)     NULL,
  `status`           ENUM('draft','published','scheduled','archived') NULL,
  `seo_score`        INT          NULL,
  `reason`           VARCHAR(255) NULL,
  `author_id`        CHAR(36)     NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_revision` (`post_id`, `revision_number`),
  CONSTRAINT `fk_rev_post`   FOREIGN KEY (`post_id`)   REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rev_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- homepage_sections — builder homepage (draft + published).
-- ---------------------------------------------------------------------
CREATE TABLE `homepage_sections` (
  `id`                CHAR(36)     NOT NULL,
  `section_key`       VARCHAR(128) NOT NULL,
  `title`             VARCHAR(255) NULL,
  `is_visible`        TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`        INT          NOT NULL DEFAULT 0,
  `data`              JSON         NOT NULL,
  `draft_data`        JSON         NULL,
  `status`            VARCHAR(32)  NOT NULL DEFAULT 'draft',
  `last_published_at` DATETIME     NULL,
  `last_saved_at`     DATETIME     NULL,
  `last_saved_by`     CHAR(36)     NULL,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_section_key` (`section_key`),
  KEY `idx_section_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `homepage_section_versions` (
  `id`          CHAR(36)     NOT NULL,
  `section_key` VARCHAR(128) NOT NULL,
  `version`     INT          NOT NULL,
  `title`       VARCHAR(255) NULL,
  `data`        JSON         NOT NULL,
  `note`        VARCHAR(512) NULL,
  `created_by`  CHAR(36)     NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_section_version` (`section_key`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- media_usage — relasi file dengan tempat pemakaiannya.
-- ---------------------------------------------------------------------
CREATE TABLE `media_usage` (
  `id`         CHAR(36)     NOT NULL,
  `media_id`   CHAR(36)     NOT NULL,
  `context`    VARCHAR(128) NOT NULL,
  `context_id` VARCHAR(128) NOT NULL,
  `field`      VARCHAR(128) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usage_media` (`media_id`),
  KEY `idx_usage_context` (`context`, `context_id`),
  CONSTRAINT `fk_usage_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- menu_items — navigasi header/footer.
-- ---------------------------------------------------------------------
CREATE TABLE `menu_items` (
  `id`         CHAR(36)     NOT NULL,
  `location`   VARCHAR(64)  NOT NULL,
  `label`      VARCHAR(255) NOT NULL,
  `href`       VARCHAR(512) NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `group_name` VARCHAR(128) NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_menu_location` (`location`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- redirects
-- ---------------------------------------------------------------------
CREATE TABLE `redirects` (
  `id`             CHAR(36)     NOT NULL,
  `source`         VARCHAR(512) NOT NULL,
  `destination`    VARCHAR(512) NOT NULL,
  `code`           INT          NOT NULL DEFAULT 301,
  `active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `preserve_query` TINYINT(1)   NOT NULL DEFAULT 1,
  `hits`           BIGINT       NOT NULL DEFAULT 0,
  `last_hit_at`    DATETIME     NULL,
  `notes`          TEXT         NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_redirect_source` (`source`),
  KEY `idx_redirect_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ip_lists — allow/deny list keamanan.
-- ---------------------------------------------------------------------
CREATE TABLE `ip_lists` (
  `id`         CHAR(36)    NOT NULL,
  `ip`         VARCHAR(64) NOT NULL,
  `list_type`  VARCHAR(32) NOT NULL,
  `note`       TEXT        NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_list` (`list_type`, `ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- activity_log — audit trail.
-- ---------------------------------------------------------------------
CREATE TABLE `activity_log` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NULL,
  `action`     VARCHAR(128) NOT NULL,
  `entity`     VARCHAR(128) NULL,
  `entity_id`  VARCHAR(128) NULL,
  `ip`         VARCHAR(64)  NULL,
  `meta`       JSON         NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_created` (`created_at`),
  CONSTRAINT `fk_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
