<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$target_dir = "uploads/"; // Make sure this folder exists and has 755 or 777 permissions
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if (!isset($_FILES["image"])) {
    echo json_encode(["success" => false, "message" => "No image file provided"]);
    exit();
}

$file = $_FILES["image"];
$fileName = time() . '_' . basename($file["name"]);
$fileName = preg_replace("/[^a-zA-Z0-9.\-_]/", "", $fileName); // Sanitize filename
$target_file = $target_dir . $fileName;

// Check if image file is a actual image or fake image
$check = getimagesize($file["tmp_name"]);
if ($check === false) {
    echo json_encode(["success" => false, "message" => "File is not an image."]);
    exit();
}

if (move_uploaded_file($file["tmp_name"], $target_file)) {
    // Return the full URL
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
    $domain = $_SERVER['HTTP_HOST'];
    $url = $protocol . "://" . $domain . dirname($_SERVER['PHP_SELF']) . "/" . $target_file;
    
    echo json_encode(["success" => true, "url" => str_replace('\\', '/', $url)]);
} else {
    echo json_encode(["success" => false, "message" => "Sorry, there was an error uploading your file."]);
}
?>
