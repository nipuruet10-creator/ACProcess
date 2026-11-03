<?php
/**
 * Walton AC Process Development Monthly Report Suite
 * Module: Hostinger OpenRouter AI Proxy API
 * Proxies OpenRouter Free API requests with automatic model fallback, error recovery, and CORS
 * WALTON Hi-Tech Industries PLC
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
@ini_set('max_execution_time', '60');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, x-openrouter-key');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'online',
        'service' => 'Walton OpenRouter Proxy API',
        'php_version' => phpversion(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) {
    $body = [];
}

// Extract API Key
$serverKey = getenv('OPENROUTER_API_KEY') ?: '';
$headerKey = '';
if (!empty($_SERVER['HTTP_X_OPENROUTER_KEY'])) {
    $headerKey = trim($_SERVER['HTTP_X_OPENROUTER_KEY']);
} elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headerKey = trim(str_ireplace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']));
}
$bodyKey = !empty($body['apiKey']) ? trim($body['apiKey']) : '';
$effectiveKey = $serverKey ?: ($headerKey ?: $bodyKey);

if (empty($effectiveKey)) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'code' => 'MISSING_API_KEY',
        'error' => 'OpenRouter API key is not configured. Please enter your key in Settings.'
    ]);
    exit;
}

$action = !empty($body['action']) ? $body['action'] : 'chat';
$reqModel = !empty($body['model']) ? trim($body['model']) : 'openrouter/free';
if (stripos($reqModel, 'gemini-2.0-flash-exp') !== false) {
    $reqModel = 'openrouter/free';
}

// 1. ACTION: MODELS
if ($action === 'models') {
    $ch = curl_init('https://openrouter.ai/api/v1/models');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $effectiveKey,
        'HTTP-Referer: https://waltonbd.com',
        'X-Title: Walton AC Process Monthly Report'
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        $data = json_decode($resp, true);
        echo json_encode(['success' => true, 'data' => $data['data'] ?? []]);
    } else {
        http_response_code($httpCode ?: 500);
        echo json_encode(['success' => false, 'error' => 'Failed to fetch models from OpenRouter']);
    }
    exit;
}

// 2. ACTION: TEST
if ($action === 'test') {
    $testPayload = [
        'model' => $reqModel,
        'messages' => [['role' => 'user', 'content' => 'Say OK']],
        'max_tokens' => 50,
        'temperature' => 0.1
    ];
    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testPayload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $effectiveKey,
        'HTTP-Referer: https://waltonbd.com',
        'X-Title: Walton AC Process Monthly Report',
        'Content-Type: application/json'
    ]);
    $startTime = microtime(true);
    $resp = curl_exec($ch);
    $latency = round((microtime(true) - $startTime) * 1000);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        $data = json_decode($resp, true);
        $reply = $data['choices'][0]['message']['content'] ?? 'OK';
        echo json_encode([
            'success' => true,
            'status' => 'Connected',
            'provider' => 'OpenRouter',
            'model' => $reqModel,
            'reply' => trim($reply),
            'latency' => $latency
        ]);
    } else {
        http_response_code($httpCode ?: 500);
        $errData = json_decode($resp, true);
        $errMsg = $errData['error']['message'] ?? ('HTTP ' . $httpCode);
        echo json_encode([
            'success' => false,
            'error' => $errMsg,
            'status' => 'Failed',
            'code' => $httpCode,
            'latency' => $latency
        ]);
    }
    exit;
}

// 3. ACTION: CHAT
$messages = !empty($body['messages']) ? $body['messages'] : [
    ['role' => 'user', 'content' => !empty($body['prompt']) ? $body['prompt'] : 'Hello']
];
$temperature = isset($body['temperature']) ? floatval($body['temperature']) : 0.2;
$maxTokens = isset($body['max_tokens']) ? intval($body['max_tokens']) : 600;

// Candidates for fallback if primary returns 404 or 429
$modelsToTry = [$reqModel];
$freeFallbacks = [
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3.5-lightning:free'
];
foreach ($freeFallbacks as $fb) {
    if (!in_array($fb, $modelsToTry)) {
        $modelsToTry[] = $fb;
    }
}

$lastError = '';
$lastCode = 500;
$startTime = microtime(true);

foreach ($modelsToTry as $currentModel) {
    $payload = [
        'model' => $currentModel,
        'messages' => $messages,
        'temperature' => $temperature,
        'max_tokens' => $maxTokens
    ];
    if (!empty($body['response_format'])) {
        $payload['response_format'] = $body['response_format'];
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $effectiveKey,
        'HTTP-Referer: https://waltonbd.com',
        'X-Title: Walton AC Process Monthly Report',
        'Content-Type: application/json'
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // If 400 because response_format is not supported, retry without response_format
    if ($httpCode === 400 && !empty($payload['response_format'])) {
        unset($payload['response_format']);
        $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $effectiveKey,
            'HTTP-Referer: https://waltonbd.com',
            'X-Title: Walton AC Process Monthly Report',
            'Content-Type: application/json'
        ]);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        $data = json_decode($resp, true);
        $msg = $data['choices'][0]['message'] ?? null;
        $content = $msg['content'] ?? ($msg['reasoning'] ?? '');
        $latency = round((microtime(true) - $startTime) * 1000);

        echo json_encode([
            'success' => true,
            'content' => $content,
            'model' => $currentModel,
            'latency' => $latency
        ]);
        exit;
    }

    $errJson = json_decode($resp, true);
    $lastError = $errJson['error']['message'] ?? ('HTTP ' . $httpCode);
    $lastCode = $httpCode;

    // Only retry on 404 (model not found) or 429 (rate limited)
    if ($httpCode !== 404 && $httpCode !== 429) {
        break;
    }
}

http_response_code($lastCode ?: 500);
echo json_encode([
    'success' => false,
    'error' => $lastError ?: 'OpenRouter request failed',
    'code' => $lastCode
]);
