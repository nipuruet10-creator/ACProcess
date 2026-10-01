<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Delete Photo API
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

try {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);

    $taskId = isset($jsonData['taskId']) ? trim($jsonData['taskId']) : (isset($_POST['taskId']) ? trim($_POST['taskId']) : '');
    $month = isset($jsonData['month']) ? trim($jsonData['month']) : (isset($_POST['month']) ? trim($_POST['month']) : 'SEP-2026');
    $slot = isset($jsonData['slot']) ? trim($jsonData['slot']) : (isset($_POST['slot']) ? trim($_POST['slot']) : 'after_photo');

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing taskId.']);
        exit;
    }

    $cleanTaskId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $taskId);
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));
    if ($slot === 'photo_1') $slot = 'before_photo';
    if ($slot === 'photo_2') $slot = 'after_photo';

    $baseUploadDir = dirname(__DIR__) . '/uploads';
    $photosDir = $baseUploadDir . '/photos/' . $cleanMonth;

    // Delete matching files from disk
    $extensions = ['jpg', 'jpeg', 'png', 'webp'];
    foreach ($extensions as $ext) {
        $path = $photosDir . '/' . $cleanTaskId . '_' . $slot . '.' . $ext;
        if (file_exists($path)) {
            @unlink($path);
        }
    }

    // Update monthly index
    $indexFile = $baseUploadDir . '/photos_' . $cleanMonth . '.json';
    if (file_exists($indexFile)) {
        $raw = @file_get_contents($indexFile);
        $catalog = json_decode($raw, true);
        if (is_array($catalog) && isset($catalog[$cleanTaskId])) {
            if ($slot === 'after_photo') {
                $catalog[$cleanTaskId]['after_photo'] = null;
                $catalog[$cleanTaskId]['photo_2'] = null;
                $catalog[$cleanTaskId]['photo'] = $catalog[$cleanTaskId]['before_photo'] ?? null;
            } else {
                $catalog[$cleanTaskId]['before_photo'] = null;
                $catalog[$cleanTaskId]['photo_1'] = null;
            }
            $catalog[$cleanTaskId]['updated_at'] = date('Y-m-d H:i:s');
            @file_put_contents($indexFile, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }

    // Update master index
    $masterIndex = $baseUploadDir . '/photos_index.json';
    if (file_exists($masterIndex)) {
        $raw = @file_get_contents($masterIndex);
        $master = json_decode($raw, true);
        if (is_array($master) && isset($master[$cleanTaskId])) {
            if ($slot === 'after_photo') {
                $master[$cleanTaskId]['after_photo'] = null;
                $master[$cleanTaskId]['photo_2'] = null;
            } else {
                $master[$cleanTaskId]['before_photo'] = null;
                $master[$cleanTaskId]['photo_1'] = null;
            }
            @file_put_contents($masterIndex, json_encode($master, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Photo removed from server.',
        'taskId' => $cleanTaskId,
        'slot' => $slot
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
