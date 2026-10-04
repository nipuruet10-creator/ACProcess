<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Hostinger Permanent Server Photo Storage API
 * Handles: Base64 or Binary photo uploads, local disk persistence, index cataloging, and CORS
 */

// Enable error reporting for logs but output clean JSON
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Headers & CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    // 1. Parse Input (Supports both JSON payload and multipart/form-data)
    $taskId = '';
    $month = 'SEP-2026';
    $slot = 'after_photo';
    $imageData = '';

    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);

    if (is_array($jsonData)) {
        $taskId = isset($jsonData['taskId']) ? trim($jsonData['taskId']) : '';
        $month = isset($jsonData['month']) ? trim($jsonData['month']) : 'SEP-2026';
        $slot = isset($jsonData['slot']) ? trim($jsonData['slot']) : 'after_photo';
        $imageData = isset($jsonData['image']) ? $jsonData['image'] : (isset($jsonData['photo']) ? $jsonData['photo'] : '');
    }

    if (empty($taskId) && isset($_POST['taskId'])) {
        $taskId = trim($_POST['taskId']);
    }
    if (isset($_POST['month']) && !empty($_POST['month'])) {
        $month = trim($_POST['month']);
    }
    if (isset($_POST['slot']) && !empty($_POST['slot'])) {
        $slot = trim($_POST['slot']);
    }

    // Check if uploaded as file via multipart
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $tmpPath = $_FILES['photo']['tmp_name'];
        $rawBytes = file_get_contents($tmpPath);
        $mime = mime_content_type($tmpPath) ?: 'image/jpeg';
        $imageData = 'data:' . $mime . ';base64,' . base64_encode($rawBytes);
    }

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing taskId.']);
        exit;
    }

    if (empty($imageData)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing image data.']);
        exit;
    }

    // 2. Sanitize and Normalize
    // Task ID sanitizer: only alphanumeric, hyphen, underscore
    $cleanTaskId = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $taskId);
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));
    if (empty($cleanMonth)) $cleanMonth = 'SEP-2026';

    // Normalize slot: 'photo_1' -> 'before_photo', 'photo_2' -> 'after_photo'
    if ($slot === 'photo_1') $slot = 'before_photo';
    if ($slot === 'photo_2') $slot = 'after_photo';
    if (!in_array($slot, ['after_photo', 'before_photo'])) {
        $slot = 'after_photo';
    }

    // 3. Ensure Upload Directories Exist on Hostinger Disk
    $baseUploadDir = is_dir(dirname(__DIR__) . '/uploads') ? (dirname(__DIR__) . '/uploads') : (dirname(__DIR__) . '/report/uploads');
    if (!is_dir($baseUploadDir)) {
        @mkdir($baseUploadDir, 0755, true);
    }

    $photosDir = $baseUploadDir . '/photos/' . $cleanMonth;
    if (!is_dir($photosDir)) {
        @mkdir($photosDir, 0755, true);
    }

    // 4. Decode Image Data
    $extension = 'jpg';
    $binaryData = null;

    if (strpos($imageData, 'data:image/') === 0) {
        if (preg_match('/^data:image\/(\w+);base64,/', $imageData, $type)) {
            $ext = strtolower($type[1]);
            if (in_array($ext, ['png', 'jpeg', 'jpg', 'webp'])) {
                $extension = ($ext === 'jpeg') ? 'jpg' : $ext;
            }
            $cleanBase64 = substr($imageData, strpos($imageData, ',') + 1);
            $binaryData = base64_decode($cleanBase64);
        }
    } else {
        // Raw base64 string
        $binaryData = base64_decode($imageData);
    }

    if (!$binaryData) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid or corrupt image encoding.']);
        exit;
    }

    // 5. Save Image File
    $filename = $cleanTaskId . '_' . $slot . '.' . $extension;
    $filePath = $photosDir . '/' . $filename;
    $writeOk = @file_put_contents($filePath, $binaryData);

    if ($writeOk === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to write image file to Hostinger disk. Check permissions.']);
        exit;
    }

    // 6. Generate Permanent URLs
    $timestamp = time();
    $relUrl = 'uploads/photos/' . $cleanMonth . '/' . $filename . '?t=' . $timestamp;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'acprocess.com';
    $fullUrl = $scheme . '://' . $host . '/report/' . $relUrl;

    // 7. Update Persistent Server-Side JSON Catalog and clear prior deletion tombstones
    $deletedFile = $baseUploadDir . '/deleted_photos_' . $cleanMonth . '.json';
    if (file_exists($deletedFile)) {
        $rawDel = @file_get_contents($deletedFile);
        $deletedMap = json_decode($rawDel, true);
        if (is_array($deletedMap)) {
            $parts = explode('-', $cleanTaskId);
            $prefix = (count($parts) >= 3) ? ($parts[0] . '-' . $parts[1] . '-' . $parts[2]) : $cleanTaskId;
            $cleanLower = strtolower($cleanTaskId);
            $prefixLower = strtolower($prefix);
            $changedDel = false;
            if (isset($deletedMap[$cleanTaskId])) { unset($deletedMap[$cleanTaskId]); $changedDel = true; }
            if (isset($deletedMap[$cleanLower])) { unset($deletedMap[$cleanLower]); $changedDel = true; }
            if (isset($deletedMap[$prefix])) { unset($deletedMap[$prefix]); $changedDel = true; }
            if (isset($deletedMap[$prefixLower])) { unset($deletedMap[$prefixLower]); $changedDel = true; }
            if ($changedDel) {
                @file_put_contents($deletedFile, json_encode($deletedMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        }
    }

    $indexFile = $baseUploadDir . '/photos_' . $cleanMonth . '.json';
    $catalog = [];
    if (file_exists($indexFile)) {
        $rawCat = @file_get_contents($indexFile);
        $parsed = json_decode($rawCat, true);
        if (is_array($parsed)) $catalog = $parsed;
    }

    if (!isset($catalog[$cleanTaskId]) || !is_array($catalog[$cleanTaskId])) {
        $catalog[$cleanTaskId] = [
            'taskId' => $cleanTaskId,
            'month' => $cleanMonth,
            'before_photo' => null,
            'after_photo' => null,
            'photo_1' => null,
            'photo_2' => null,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    }

    if ($slot === 'after_photo') {
        $catalog[$cleanTaskId]['after_photo'] = $relUrl;
        $catalog[$cleanTaskId]['photo_2'] = $relUrl;
        $catalog[$cleanTaskId]['photo'] = $relUrl;
    } else {
        $catalog[$cleanTaskId]['before_photo'] = $relUrl;
        $catalog[$cleanTaskId]['photo_1'] = $relUrl;
    }
    $catalog[$cleanTaskId]['updated_at'] = date('Y-m-d H:i:s');

    @file_put_contents($indexFile, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    // Also update master index
    $masterIndexFile = $baseUploadDir . '/photos_index.json';
    $masterCatalog = [];
    if (file_exists($masterIndexFile)) {
        $rawMaster = @file_get_contents($masterIndexFile);
        $parsedMaster = json_decode($rawMaster, true);
        if (is_array($parsedMaster)) $masterCatalog = $parsedMaster;
    }
    $masterCatalog[$cleanMonth . '_' . $cleanTaskId] = $catalog[$cleanTaskId];
    $masterCatalog[$cleanTaskId] = $catalog[$cleanTaskId];
    @file_put_contents($masterIndexFile, json_encode($masterCatalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    // 8. Return Success Response
    echo json_encode([
        'success' => true,
        'message' => 'Photo saved permanently to Hostinger server.',
        'taskId' => $cleanTaskId,
        'month' => $cleanMonth,
        'slot' => $slot,
        'url' => $relUrl,
        'full_url' => $fullUrl,
        'file_size_kb' => round(strlen($binaryData) / 1024, 1),
        'updated_at' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
