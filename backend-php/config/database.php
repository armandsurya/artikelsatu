<?php
/**
 * Koneksi PDO tunggal (singleton) ke MySQL.
 * Semua query di aplikasi ini WAJIB memakai prepared statement.
 */

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $db     = $config['db'];

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['name'],
        $db['charset']
    );

    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Penting: emulasi dimatikan agar prepared statement benar-benar native.
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    // Simpan & baca semua waktu dalam UTC agar konsisten dengan frontend.
    $pdo->exec("SET time_zone = '+00:00'");

    return $pdo;
}

/** Ambil konfigurasi aplikasi (cached). */
function app_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}
