<?php
// Simple and secure script to restart backend Node.js process and reload Passenger
header('Content-Type: application/json');

$secret = $_GET['secret'] ?? '';
if ($secret !== 'click2it_reload_admin_2026') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

$homeDir = getenv('HOME') ?: ('/home/' . get_current_user());
$backendDest = getenv('BACKENDPATH') ?: ($homeDir . '/backend_app');
$dest = getenv('DEPLOYPATH') ?: ($homeDir . '/public_html');

$output = [];

// 1. Touch restart.txt for Phusion Passenger
@mkdir("$backendDest/tmp", 0755, true);
@touch("$backendDest/tmp/restart.txt");
@mkdir("$dest/tmp", 0755, true);
@touch("$dest/tmp/restart.txt");
@touch("$homeDir/click2it.bd/tmp/restart.txt");

// 2. Kill old process on port 4001
exec("pkill -9 -f 'server.js' 2>&1", $output);
exec("fuser -k -9 4001/tcp 2>&1", $output);

sleep(1);

// 3. Find node binary
$nodeBin = trim(shell_exec("command -v node 2>/dev/null || find " . escapeshellarg($homeDir . '/nodevenv') . " -name node -type f -print -quit 2>/dev/null || echo ''"));

if (!empty($nodeBin) && file_exists($backendDest . '/server.js')) {
    $cmd = "cd " . escapeshellarg($backendDest) . " && NODE_ENV=production PORT=4001 nohup " . escapeshellarg($nodeBin) . " server.js > " . escapeshellarg($backendDest . '/backend.log') . " 2>&1 &";
    exec($cmd, $output);
    sleep(2);
}

// 4. Check if port 4001 answers
$health = @file_get_contents("http://127.0.0.1:4001/api/health");
$healthData = $health ? json_decode($health, true) : null;

echo json_encode([
    'success' => true,
    'message' => 'Backend reload triggered',
    'nodeBin' => $nodeBin,
    'health' => $healthData,
    'output' => $output
]);
