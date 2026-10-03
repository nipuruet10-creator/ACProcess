<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Top 5 Works & Projects Cloud Sync API
 * Keeps Top 5 Completed & Ongoing Projects synchronized across all PCs
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$baseUploadDir = dirname(__DIR__) . '/uploads';
if (!is_dir($baseUploadDir)) {
    @mkdir($baseUploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $month = isset($_GET['month']) ? trim($_GET['month']) : 'SEP-2026';
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));
    $topWorksFile = $baseUploadDir . '/top_works_' . $cleanMonth . '.json';
    
    $data = null;
    if (file_exists($topWorksFile)) {
        $raw = @file_get_contents($topWorksFile);
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) $data = $parsed;
    }

    echo json_encode([
        'success' => true,
        'month' => $cleanMonth,
        'data' => $data
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);

    if (!is_array($jsonData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.']);
        exit;
    }

    $month = isset($jsonData['month']) ? trim($jsonData['month']) : 'SEP-2026';
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));
    $topWorksFile = $baseUploadDir . '/top_works_' . $cleanMonth . '.json';

    $payload = [
        'month' => $cleanMonth,
        'completedTop5' => isset($jsonData['completedTop5']) ? $jsonData['completedTop5'] : [],
        'ongoingTop5' => isset($jsonData['ongoingTop5']) ? $jsonData['ongoingTop5'] : [],
        'updated_at' => date('Y-m-d H:i:s')
    ];

    @file_put_contents($topWorksFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    echo json_encode([
        'success' => true,
        'message' => 'Top 5 Works saved to server successfully.',
        'month' => $cleanMonth,
        'data' => $payload
    ]);
    exit;
}
