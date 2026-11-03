<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$base = dirname(__DIR__) . '/uploads';
$delFile = $base . '/deleted_photos_OCT-2026.json';
$catFile = $base . '/photos_OCT-2026.json';
$photosDir = $base . '/photos/OCT-2026';

$delContent = file_exists($delFile) ? json_decode(file_get_contents($delFile), true) : null;
$catContent = file_exists($catFile) ? json_decode(file_get_contents($catFile), true) : null;
$diskFiles = is_dir($photosDir) ? scandir($photosDir) : [];

echo json_encode([
    'disk_files' => array_values(array_filter($diskFiles, fn($f) => $f !== '.' && $f !== '..')),
    'deleted_keys' => is_array($delContent) ? array_keys($delContent) : [],
    'deleted_sample' => is_array($delContent) ? array_slice($delContent, 0, 5, true) : [],
    'catalog_keys' => is_array($catContent) ? array_keys($catContent) : []
]);
