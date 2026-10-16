<?php
/**
 * CLICK2IT - High Compatibility OpenGraph & Social Media Preview Generator
 * Supports: WhatsApp, Facebook, Messenger, Twitter, Telegram, LinkedIn, Discord, etc.
 */

// 1. Gather input parameters
$product_id = isset($_GET['id']) ? trim($_GET['id']) : '';
$title = isset($_GET['title']) ? trim($_GET['title']) : '';
$price = isset($_GET['price']) ? trim($_GET['price']) : '';
$raw_image = isset($_GET['img']) ? trim($_GET['img']) : '';
$desc = isset($_GET['desc']) ? trim($_GET['desc']) : '';

// 2. If title or image was not passed in query params, fetch directly from Firestore REST API
if ((empty($raw_image) || empty($title)) && !empty($product_id)) {
    $cache_file = sys_get_temp_dir() . '/c2i_p_' . md5($product_id) . '.json';
    $cache_valid = false;

    if (file_exists($cache_file) && (time() - filemtime($cache_file) < 3600)) {
        $cached_data = json_decode(@file_get_contents($cache_file), true);
        if (!empty($cached_data)) {
            $title = $cached_data['title'] ?? $title;
            $price = $cached_data['price'] ?? $price;
            $raw_image = $cached_data['img'] ?? $raw_image;
            $desc = $cached_data['desc'] ?? $desc;
            $cache_valid = true;
        }
    }

    if (!$cache_valid) {
        try {
            $firestore_url = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0990631330/databases/ai-studio-422fbad2-d827-4e69-8599-aed85390d277/documents/products/' . urlencode($product_id);
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 2.5,
                    'ignore_errors' => true
                ]
            ]);
            $json = @file_get_contents($firestore_url, false, $ctx);
            if ($json) {
                $doc = json_decode($json, true);
                if (!empty($doc['fields'])) {
                    $f = $doc['fields'];
                    if (!empty($f['name']['stringValue'])) {
                        $title = $f['name']['stringValue'];
                    }
                    if (!empty($f['discountPrice']['integerValue'])) {
                        $price = (string)$f['discountPrice']['integerValue'];
                    } elseif (!empty($f['price']['integerValue'])) {
                        $price = (string)$f['price']['integerValue'];
                    } elseif (!empty($f['price']['doubleValue'])) {
                        $price = (string)$f['price']['doubleValue'];
                    }

                    if (!empty($f['imageUrl']['stringValue'])) {
                        $raw_image = $f['imageUrl']['stringValue'];
                    } elseif (!empty($f['images']['arrayValue']['values'][0]['stringValue'])) {
                        $raw_image = $f['images']['arrayValue']['values'][0]['stringValue'];
                    }

                    if (!empty($f['shortDescription']['stringValue'])) {
                        $desc = mb_substr(strip_tags($f['shortDescription']['stringValue']), 0, 160);
                    } elseif (!empty($f['description']['stringValue'])) {
                        $desc = mb_substr(strip_tags($f['description']['stringValue']), 0, 160);
                    }

                    // Save to cache
                    @file_put_contents($cache_file, json_encode([
                        'title' => $title,
                        'price' => $price,
                        'img' => $raw_image,
                        'desc' => $desc
                    ]));
                }
            }
        } catch (Exception $e) {
            // Fallback gracefully on network error
        }
    }
}

// 3. Fallbacks
if (empty($title)) {
    $title = 'CLICK2IT - Computer & IT Store';
}
if (empty($desc)) {
    $desc = 'Best Price Computer, Laptop, CCTV, Components & IT Solutions in Bangladesh.';
}

$image = !empty($raw_image) ? $raw_image : 'https://click2itbd.com/logo.png';
if (strpos($image, 'http') !== 0) {
    $image = 'https://click2itbd.com' . (strpos($image, '/') === 0 ? '' : '/') . $image;
}
// Clean up accidental duplicate slashes
$image = preg_replace('#([^:])//+#', '$1/', $image);

$display_title = $title;
if (!empty($price) && is_numeric($price)) {
    $display_title .= ' - ৳' . number_format((float)$price);
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "https://";
$host = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'click2itbd.com';
$target_url = $product_id ? ($protocol . $host . "/product/" . urlencode($product_id)) : ($protocol . $host);

// Detect image mime type
$image_type = 'image/jpeg';
if (stripos($image, '.webp') !== false) {
    $image_type = 'image/webp';
} elseif (stripos($image, '.png') !== false) {
    $image_type = 'image/png';
}

// 4. Crawler Detection
$user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
$is_crawler = preg_match('/(facebookexternalhit|Facebot|WhatsApp|Twitterbot|Pinterest|LinkedInBot|TelegramBot|Slackbot|Discordbot|SkypeUriPreview|Viber|kakaotalk-scrap|vkShare)/i', $user_agent);

// 5. If human visitor, redirect to the real React product page instantly
if (!$is_crawler && !empty($product_id)) {
    header("Location: " . $target_url, true, 302);
    exit();
}
?>
<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($display_title); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($desc); ?>">

    <!-- Open Graph / Facebook / WhatsApp / Messenger -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="CLICK2IT">
    <meta property="og:url" content="<?php echo htmlspecialchars($target_url); ?>">
    <meta property="og:title" content="<?php echo htmlspecialchars($display_title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($desc); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($image); ?>">
    <meta property="og:image:secure_url" content="<?php echo htmlspecialchars($image); ?>">
    <meta property="og:image:type" content="<?php echo $image_type; ?>">
    <meta property="og:image:width" content="600">
    <meta property="og:image:height" content="600">
    <meta property="og:image:alt" content="<?php echo htmlspecialchars($title); ?>">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@click2itbd">
    <meta name="twitter:url" content="<?php echo htmlspecialchars($target_url); ?>">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($display_title); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($desc); ?>">
    <meta name="twitter:image" content="<?php echo htmlspecialchars($image); ?>">

    <!-- Fallback redirect for non-crawler browsers -->
    <meta http-equiv="refresh" content="0;url=<?php echo htmlspecialchars($target_url); ?>">
    <script>
        window.location.replace("<?php echo $target_url; ?>");
    </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b;">
    <div style="text-align: center; padding: 24px; max-width: 480px;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Redirecting to Product...</h2>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">Please wait while we take you to CLICK2IT.</p>
        <a href="<?php echo htmlspecialchars($target_url); ?>" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Click here if not redirected</a>
    </div>
</body>
</html>
