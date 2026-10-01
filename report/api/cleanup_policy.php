<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Server Retention Policy Manager
 * Rules:
 * 1. Rolling 2 months retained: Current reporting month (SEP-2026) and previous month (AUG-2026).
 * 2. In October 2026: AUG-2026 is kept accessible until October 10th.
 * 3. On October 11th and later: AUG-2026 is automatically cleaned/pruned from server.
 * 4. JAN-2026 through JUL-2026 are permanently purged.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

function isMonthExpiredOnServer($monthCode) {
    $clean = strtoupper(trim($monthCode));
    $parts = explode('-', $clean);
    if (count($parts) !== 2) return false;
    
    $mStr = $parts[0];
    $yVal = intval($parts[1]);
    $monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    $mIdx = array_search($mStr, $monthNames);
    if ($mIdx === false || $yVal <= 0) return false;

    // Purge Jan-Jul 2026 permanently
    if ($yVal === 2026 && $mIdx < 7) {
        return true;
    }

    $now = new DateTime();
    $currentYear = intval($now->format('Y'));
    $currentMonth = intval($now->format('n')); // 1 to 12 (10 = October)
    $currentDay = intval($now->format('j'));   // 1 to 31

    // Specific user rule for August 2026:
    if ($clean === 'AUG-2026') {
        if ($currentYear > 2026) return true;
        if ($currentYear === 2026) {
            if ($currentMonth > 10) return true; // November or later
            if ($currentMonth === 10) {
                return ($currentDay > 10); // True if Oct 11 or later, false if Oct 1..10
            }
            return false; // September or earlier
        }
        return false;
    }

    // General 2-month rolling calculation
    $score = $yVal * 12 + $mIdx;
    $currentScore = $currentYear * 12 + ($currentMonth - 1);
    $diff = $currentScore - $score;

    if ($diff <= 1) return false; // Current or 1 month ago: always kept
    if ($diff === 2) {
        // 2 months ago: allowed until day 10 of current month
        return ($currentDay > 10);
    }
    return true; // 3 or more months ago: expired
}

function deleteDirectoryRecursively($dir) {
    if (!is_dir($dir)) return false;
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        $path = "$dir/$file";
        is_dir($path) ? deleteDirectoryRecursively($path) : @unlink($path);
    }
    return @rmdir($dir);
}

$baseUploadDir = dirname(__DIR__) . '/uploads';
$photosDir = $baseUploadDir . '/photos';
$cleanedMonths = [];

if (is_dir($photosDir)) {
    $dirs = array_diff(scandir($photosDir), ['.', '..']);
    foreach ($dirs as $mDir) {
        if (is_dir("$photosDir/$mDir")) {
            if (isMonthExpiredOnServer($mDir)) {
                deleteDirectoryRecursively("$photosDir/$mDir");
                @unlink("$baseUploadDir/photos_$mDir.json");
                @unlink("$baseUploadDir/overrides_$mDir.json");
                $cleanedMonths[] = $mDir;
            }
        }
    }
}

echo json_encode([
    'success' => true,
    'checked_at' => date('Y-m-d H:i:s'),
    'cleaned_expired_months' => $cleanedMonths,
    'active_policy' => '2-Month Rolling with 10th-of-month grace period'
]);
