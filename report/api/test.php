<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode([
    'status' => 'online',
    'php_version' => phpversion(),
    'version' => 'v20261103_4',
    'time' => date('Y-m-d H:i:s')
]);
