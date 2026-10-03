<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Slide Editorial Overrides Cloud Sync API
 * Keeps Slide Title, Description, Impact, and Category synced across all PCs
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
    $overridesFile = $baseUploadDir . '/overrides_' . $cleanMonth . '.json';
    
    $overrides = [];
    if (file_exists($overridesFile)) {
        $raw = @file_get_contents($overridesFile);
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) $overrides = $parsed;
    }

    echo json_encode([
        'success' => true,
        'month' => $cleanMonth,
        'count' => count($overrides),
        'overrides' => $overrides
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

    $taskId = isset($jsonData['taskId']) ? trim($jsonData['taskId']) : '';
    $month = isset($jsonData['month']) ? trim($jsonData['month']) : 'SEP-2026';
    $overrideData = isset($jsonData['overrides']) ? $jsonData['overrides'] : [];

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing taskId.']);
        exit;
    }

    $cleanTaskId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $taskId);
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));
    $overridesFile = $baseUploadDir . '/overrides_' . $cleanMonth . '.json';

    $allOverrides = [];
    if (file_exists($overridesFile)) {
        $raw = @file_get_contents($overridesFile);
        $parsed = json_decode($raw, true);
        if (is_array($parsed)) $allOverrides = $parsed;
    }

    $overrideData['taskId'] = $cleanTaskId;
    $overrideData['updated_at'] = date('Y-m-d H:i:s');
    $allOverrides[$cleanTaskId] = $overrideData;

    @file_put_contents($overridesFile, json_encode($allOverrides, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    echo json_encode([
        'success' => true,
        'message' => 'Overrides saved to server successfully.',
        'taskId' => $cleanTaskId,
        'month' => $cleanMonth,
        'data' => $overrideData
    ]);
    exit;
}
