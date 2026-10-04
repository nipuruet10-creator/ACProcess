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

    $baseUploadDir = is_dir(dirname(__DIR__) . '/uploads') ? (dirname(__DIR__) . '/uploads') : (dirname(__DIR__) . '/report/uploads');
    $photosDir = $baseUploadDir . '/photos/' . $cleanMonth;

    $parts = explode('-', $cleanTaskId);
    $prefix = (count($parts) >= 3) ? ($parts[0] . '-' . $parts[1] . '-' . $parts[2]) : $cleanTaskId;

    // 1. Physically delete all matching image files from disk
    if (is_dir($photosDir)) {
        $files = scandir($photosDir);
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            $match = false;
            if (stripos($f, $cleanTaskId) !== false || stripos($f, $prefix) !== false) {
                if ($slot === 'all') {
                    $match = true;
                } elseif ($slot === 'after_photo' && (stripos($f, 'after_photo') !== false || stripos($f, 'photo_2') !== false || stripos($f, '_photo.') !== false)) {
                    $match = true;
                } elseif ($slot === 'before_photo' && (stripos($f, 'before_photo') !== false || stripos($f, 'photo_1') !== false)) {
                    $match = true;
                }
            }
            if ($match) {
                @unlink($photosDir . '/' . $f);
            }
        }
    }

    // 2. Record tombstone in permanent deleted_photos list
    $deletedFile = $baseUploadDir . '/deleted_photos_' . $cleanMonth . '.json';
    $deletedMap = [];
    if (file_exists($deletedFile)) {
        $rawDel = @file_get_contents($deletedFile);
        $parsedDel = json_decode($rawDel, true);
        if (is_array($parsedDel)) $deletedMap = $parsedDel;
    }
    $nowTime = time();
    $deletedMap[$cleanTaskId] = ['time' => $nowTime, 'slot' => $slot];
    $deletedMap[$prefix] = ['time' => $nowTime, 'slot' => $slot];
    @file_put_contents($deletedFile, json_encode($deletedMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    // 3. Update monthly index
    $indexFile = $baseUploadDir . '/photos_' . $cleanMonth . '.json';
    if (file_exists($indexFile)) {
        $raw = @file_get_contents($indexFile);
        $catalog = json_decode($raw, true);
        if (is_array($catalog)) {
            foreach ([$cleanTaskId, $prefix] as $keyToClean) {
                if (isset($catalog[$keyToClean])) {
                    if ($slot === 'all') {
                        unset($catalog[$keyToClean]);
                    } elseif ($slot === 'after_photo') {
                        $catalog[$keyToClean]['after_photo'] = null;
                        $catalog[$keyToClean]['photo_2'] = null;
                        $catalog[$keyToClean]['photo'] = $catalog[$keyToClean]['before_photo'] ?? null;
                    } else {
                        $catalog[$keyToClean]['before_photo'] = null;
                        $catalog[$keyToClean]['photo_1'] = null;
                    }
                }
            }
            @file_put_contents($indexFile, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }

    // 4. Update master index
    $masterIndex = $baseUploadDir . '/photos_index.json';
    if (file_exists($masterIndex)) {
        $raw = @file_get_contents($masterIndex);
        $master = json_decode($raw, true);
        if (is_array($master)) {
            foreach ([$cleanTaskId, $prefix] as $keyToClean) {
                if (isset($master[$keyToClean])) {
                    if ($slot === 'all') {
                        unset($master[$keyToClean]);
                    } elseif ($slot === 'after_photo') {
                        $master[$keyToClean]['after_photo'] = null;
                        $master[$keyToClean]['photo_2'] = null;
                        $master[$keyToClean]['photo'] = $master[$keyToClean]['before_photo'] ?? null;
                    } else {
                        $master[$keyToClean]['before_photo'] = null;
                        $master[$keyToClean]['photo_1'] = null;
                    }
                }
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
