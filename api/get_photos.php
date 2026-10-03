<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Get Photos API (Fetches all server-stored photos across devices)
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $month = isset($_GET['month']) ? trim($_GET['month']) : '';
    $cleanMonth = preg_replace('/[^a-zA-Z0-9_\-]/', '', strtoupper($month));

    $baseUploadDir = is_dir(dirname(__DIR__) . '/uploads') ? (dirname(__DIR__) . '/uploads') : (dirname(__DIR__) . '/report/uploads');
    $catalog = [];

    if (!empty($cleanMonth) && $cleanMonth !== 'ALL') {
        $indexFile = $baseUploadDir . '/photos_' . $cleanMonth . '.json';
        if (file_exists($indexFile)) {
            $raw = @file_get_contents($indexFile);
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) $catalog = $parsed;
        }

        // Reconcile with actual physical files on disk so index is never out of sync
        $photosDir = $baseUploadDir . '/photos/' . $cleanMonth;
        if (is_dir($photosDir)) {
            $files = scandir($photosDir);
            $foundAny = false;
            foreach ($files as $f) {
                if ($f === '.' || $f === '..') continue;
                // Format: {taskId}_{slot}.ext
                if (preg_match('/^(.+)_(before_photo|after_photo)\.(jpg|jpeg|png|webp)$/i', $f, $m)) {
                    $tId = $m[1];
                    $slot = $m[2];
                    if (!isset($catalog[$tId]) || !is_array($catalog[$tId])) {
                        $catalog[$tId] = [
                            'taskId' => $tId,
                            'month' => $cleanMonth,
                            'before_photo' => null,
                            'after_photo' => null,
                            'photo_1' => null,
                            'photo_2' => null,
                            'photo' => null
                        ];
                    }
                    $relUrl = 'uploads/photos/' . $cleanMonth . '/' . $f;
                    $mtime = filemtime($photosDir . '/' . $f);
                    $urlWithT = $relUrl . '?t=' . ($mtime ?: time());

                    if ($slot === 'after_photo') {
                        $catalog[$tId]['after_photo'] = $urlWithT;
                        $catalog[$tId]['photo_2'] = $urlWithT;
                        $catalog[$tId]['photo'] = $urlWithT;
                    } else {
                        $catalog[$tId]['before_photo'] = $urlWithT;
                        $catalog[$tId]['photo_1'] = $urlWithT;
                    }
                    $foundAny = true;
                }
            }
            if ($foundAny) {
                @file_put_contents($indexFile, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            }
        }
    } else {
        // Return master catalog across all months
        $masterIndex = $baseUploadDir . '/photos_index.json';
        if (file_exists($masterIndex)) {
            $raw = @file_get_contents($masterIndex);
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) $catalog = $parsed;
        }

        // Reconcile with all month folders on disk
        $photosParentDir = $baseUploadDir . '/photos';
        if (is_dir($photosParentDir)) {
            $monthDirs = scandir($photosParentDir);
            foreach ($monthDirs as $mDir) {
                if ($mDir === '.' || $mDir === '..' || !is_dir($photosParentDir . '/' . $mDir)) continue;
                $mFiles = scandir($photosParentDir . '/' . $mDir);
                foreach ($mFiles as $f) {
                    if ($f === '.' || $f === '..') continue;
                    if (preg_match('/^(.+)_(before_photo|after_photo)\.(jpg|jpeg|png|webp)$/i', $f, $m)) {
                        $tId = $m[1];
                        $slot = $m[2];
                        if (!isset($catalog[$tId]) || !is_array($catalog[$tId])) {
                            $catalog[$tId] = [
                                'taskId' => $tId,
                                'month' => $mDir,
                                'before_photo' => null,
                                'after_photo' => null,
                                'photo_1' => null,
                                'photo_2' => null,
                                'photo' => null
                            ];
                        }
                        $relUrl = 'uploads/photos/' . $mDir . '/' . $f;
                        $mtime = filemtime($photosParentDir . '/' . $mDir . '/' . $f);
                        $urlWithT = $relUrl . '?t=' . ($mtime ?: time());

                        if ($slot === 'after_photo') {
                            $catalog[$tId]['after_photo'] = $urlWithT;
                            $catalog[$tId]['photo_2'] = $urlWithT;
                            $catalog[$tId]['photo'] = $urlWithT;
                        } else {
                            $catalog[$tId]['before_photo'] = $urlWithT;
                            $catalog[$tId]['photo_1'] = $urlWithT;
                        }
                    }
                }
            }
        }
    }

    echo json_encode([
        'success' => true,
        'month' => $cleanMonth ?: 'ALL',
        'count' => count($catalog),
        'photos' => $catalog
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
