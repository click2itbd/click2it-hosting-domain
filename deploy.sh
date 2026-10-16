#!/bin/bash
# Universal deployment script for cPanel
# This script uses $HOME so it works automatically on ANY cPanel account

DEST="$HOME/public_html"
BACKEND_DEST="$HOME/backend_app"

set -e

echo "Starting deployment to $DEST..."

# ==============================
# FRONTEND
# ==============================

# Verify frontend build exists BEFORE touching public_html
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "Warning: dist folder or dist/index.html not found! Attempting emergency build..."
  npm run build 2>/dev/null || npx vite build 2>/dev/null || true
fi

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  # Clean old frontend files only after confirming new build is ready
  /bin/rm -rf "$DEST/assets"
  /bin/rm -rf "$DEST/api"
  /bin/rm -f "$DEST/index.html"
  /bin/rm -f "$DEST/_redirects"
  /bin/rm -f "$DEST/robots.txt"
  /bin/rm -f "$DEST/sitemap.xml"
  /bin/rm -f "$DEST/logo.png"
  /bin/rm -f "$DEST/upload.php"
  /bin/rm -f "$DEST/share.php"
  /bin/rm -f "$DEST/steadfast.php"

  # Deploy frontend build
  /bin/cp -R dist/. "$DEST/"
  /bin/cp -f dist/.htaccess "$DEST/.htaccess" 2>/dev/null || true
  /bin/cp -f upload.php "$DEST/" 2>/dev/null || true
  /bin/cp -f share.php "$DEST/" 2>/dev/null || true
  /bin/cp -f steadfast.php "$DEST/" 2>/dev/null || true
  echo "Frontend deployed successfully to $DEST"
else
  echo "Error: dist/index.html not found! Existing live site preserved without wiping."
  exit 1
fi

# ==============================
# BACKEND
# ==============================

# Preserve existing .env if present
if [ -f "$BACKEND_DEST/.env" ]; then
  /bin/cp "$BACKEND_DEST/.env" /tmp/saved_backend_env.tmp 2>/dev/null || true
fi

# Copy backend source and prebuilt dist without wiping node_modules
/bin/mkdir -p "$BACKEND_DEST"
/bin/cp -R backend/. "$BACKEND_DEST/"

# Restore preserved .env or copy example
if [ -f /tmp/saved_backend_env.tmp ]; then
  /bin/cp /tmp/saved_backend_env.tmp "$BACKEND_DEST/.env"
  /bin/rm -f /tmp/saved_backend_env.tmp
elif [ -f "$BACKEND_DEST/.env.example" ] && [ ! -f "$BACKEND_DEST/.env" ]; then
  /bin/cp "$BACKEND_DEST/.env.example" "$BACKEND_DEST/.env"
fi

# Remove any corrupted or stale package-lock.json to avoid npm Arborist 'edgesOut' bug
/bin/rm -f "$BACKEND_DEST/package-lock.json"

# Auto-detect and source CloudLinux nodevenv if present
NVENV="$(find "$HOME/nodevenv" -name activate -path "*/backend_app/*" -print -quit 2>/dev/null)"
if [ -n "$NVENV" ] && [ -f "$NVENV" ]; then
  source "$NVENV"
fi

# Install backend production dependencies
npm install --prefix "$BACKEND_DEST" --omit=dev --no-audit --no-fund --no-package-lock 2>/dev/null || true

# Verify backend compiled dist exists
if [ ! -f "$BACKEND_DEST/dist/server.js" ]; then
  echo "Warning: $BACKEND_DEST/dist/server.js is missing! Attempting emergency compilation..."
  npx tsc -p "$BACKEND_DEST/tsconfig.json" 2>/dev/null || true
fi

# Signal cPanel Phusion Passenger to automatically restart the Node.js process
mkdir -p "$BACKEND_DEST/tmp"
touch "$BACKEND_DEST/tmp/restart.txt"

echo "Deployment completed successfully!"
echo "Backend running from $BACKEND_DEST (entry point: server.js -> dist/server.js)"
