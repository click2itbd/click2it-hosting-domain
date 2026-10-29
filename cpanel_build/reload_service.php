<?php
header('Content-Type: application/json');

$secret = $_GET['secret'] ?? '';
if ($secret !== 'click2it_reload_admin_2026') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden']);
    exit;
}

$currentUser = get_current_user();
$homeDir = getenv('HOME') ?: ('/home/' . $currentUser);
$backendDest = getenv('BACKENDPATH') ?: ($homeDir . '/backend_app');
$dest = getenv('DEPLOYPATH') ?: ($homeDir . '/public_html');

// Common cPanel / CloudLinux Node.js binary paths
$candidateNodes = [
    '/opt/cpanel/ea-nodejs22/bin/node',
    '/opt/cpanel/ea-nodejs20/bin/node',
    '/opt/cpanel/ea-nodejs18/bin/node',
    '/opt/alt/alt-nodejs22/root/usr/bin/node',
    '/opt/alt/alt-nodejs20/root/usr/bin/node',
    '/opt/alt/alt-nodejs18/root/usr/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/node',
];

// Also search in ~/nodevenv
$foundInVenv = glob("$homeDir/nodevenv/**/bin/node");
if (!empty($foundInVenv)) {
    $candidateNodes = array_merge($foundInVenv, $candidateNodes);
}
// Try which/where
$whichNode = trim(shell_exec('which node 2>/dev/null') ?: '');
if ($whichNode) array_unshift($candidateNodes, $whichNode);

$validNode = '';
$testedNodes = [];
foreach ($candidateNodes as $nodePath) {
    if (file_exists($nodePath) && is_executable($nodePath)) {
        $ver = trim(shell_exec(escapeshellarg($nodePath) . ' -v 2>/dev/null') ?: '');
        $testedNodes[$nodePath] = $ver;
        if (!empty($ver) && empty($validNode)) {
            $validNode = $nodePath;
        }
    }
}

// Kill any old server.js
$killOutput = [];
exec("pkill -9 -f 'server.js' 2>&1", $killOutput);

// Touch restart.txt for Passenger
@mkdir("$backendDest/tmp", 0755, true);
@touch("$backendDest/tmp/restart.txt");
@mkdir("$dest/tmp", 0755, true);
@touch("$dest/tmp/restart.txt");

$spawnOutput = [];
$spawnStatus = false;
if (!empty($validNode) && file_exists($backendDest . '/server.js')) {
    $cmd = "cd " . escapeshellarg($backendDest) . " && PORT=4001 NODE_ENV=production nohup " . escapeshellarg($validNode) . " server.js > " . escapeshellarg($backendDest . '/backend.log') . " 2>&1 &";
    exec($cmd, $spawnOutput);
    $spawnStatus = true;
    sleep(2);
}

// Read log tail if exists
$logTail = '';
if (file_exists($backendDest . '/backend.log')) {
    $logTail = shell_exec("tail -n 25 " . escapeshellarg($backendDest . '/backend.log'));
}

// Check health on port 4001
$health = @file_get_contents("http://127.0.0.1:4001/api/health");
$healthData = $health ? json_decode($health, true) : null;

echo json_encode([
    'success' => !empty($healthData),
    'validNode' => $validNode,
    'testedNodes' => $testedNodes,
    'backendDest' => $backendDest,
    'serverExists' => file_exists($backendDest . '/server.js'),
    'spawnStatus' => $spawnStatus,
    'health' => $healthData,
    'logTail' => $logTail,
    'killOutput' => $killOutput
], JSON_PRETTY_PRINT);
