<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode([
    'status' => 'online',
    'php_version' => phpversion(),
    'version' => 'test-deploy-1111',
    'dir' => __DIR__,
    'writable' => is_writable(__DIR__),
    'time' => date('Y-m-d H:i:s')
]);
