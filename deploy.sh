#!/bin/bash
# Universal deployment script for cPanel Git™ Version Control
# Works automatically on standard cPanel and CloudLinux accounts

set -e

# Detect Home directory
HOME_DIR="${HOME:-/home/$(whoami)}"
DEST="${HOME_DIR}/public_html"
BACKEND_DEST="${HOME_DIR}/backend_app"

echo "=================================================="
echo " Starting cPanel Deployment: $(date)"
echo " Target Frontend: $DEST"
echo " Target Backend:  $BACKEND_DEST"
echo "=================================================="

# ==============================
# FRONTEND DEPLOYMENT
# ==============================

# Verify frontend build exists
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "⚠️ Warning: dist/index.html not found! Attempting build..."
  npm run build 2>/dev/null || npx vite build 2>/dev/null || true
fi

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "📦 Deploying frontend assets to $DEST..."
  /bin/mkdir -p "$DEST"

  # Clean old assets safely
  /bin/rm -rf "$DEST/assets"
  /bin/rm -rf "$DEST/api"
  /bin/rm -f "$DEST/index.html"
  /bin/rm -f "$DEST/_redirects"
  /bin/rm -f "$DEST/robots.txt"
  /bin/rm -f "$DEST/sitemap.xml"
  /bin/rm -f "$DEST/logo.png"

  # Deploy frontend build
  /bin/cp -R dist/. "$DEST/"

  # Ensure .htaccess exists
  if [ -f "dist/.htaccess" ]; then
    /bin/cp -f "dist/.htaccess" "$DEST/.htaccess"
  elif [ -f "public/.htaccess" ]; then
    /bin/cp -f "public/.htaccess" "$DEST/.htaccess"
  fi

  # Copy auxiliary utility scripts if present
  [ -f "upload.php" ] && /bin/cp -f upload.php "$DEST/" 2>/dev/null || true
  [ -f "share.php" ] && /bin/cp -f share.php "$DEST/" 2>/dev/null || true
  [ -f "steadfast.php" ] && /bin/cp -f steadfast.php "$DEST/" 2>/dev/null || true

  echo "✅ Frontend deployed successfully to $DEST"
else
  echo "❌ Error: dist/index.html not found! Preserving existing live site."
  exit 1
fi

# ==============================
# BACKEND DEPLOYMENT
# ==============================

echo "⚙️ Deploying backend to $BACKEND_DEST..."
/bin/mkdir -p "$BACKEND_DEST"

# Preserve existing .env if present
if [ -f "$BACKEND_DEST/.env" ]; then
  /bin/cp "$BACKEND_DEST/.env" /tmp/saved_backend_env.tmp 2>/dev/null || true
fi

# Copy backend files and pre-compiled dist
/bin/cp -R backend/. "$BACKEND_DEST/"

# Restore preserved .env or copy example
if [ -f /tmp/saved_backend_env.tmp ]; then
  /bin/cp /tmp/saved_backend_env.tmp "$BACKEND_DEST/.env"
  /bin/rm -f /tmp/saved_backend_env.tmp
elif [ -f "$BACKEND_DEST/.env.example" ] && [ ! -f "$BACKEND_DEST/.env" ]; then
  /bin/cp "$BACKEND_DEST/.env.example" "$BACKEND_DEST/.env"
fi

# Remove stale package-lock.json if needed
/bin/rm -f "$BACKEND_DEST/package-lock.json"

# Auto-detect and source CloudLinux nodevenv if present
NVENV="$(find "$HOME_DIR/nodevenv" -name activate -path "*/backend_app/*" -print -quit 2>/dev/null || true)"
if [ -n "$NVENV" ] && [ -f "$NVENV" ]; then
  echo "🔌 Sourcing Node virtual environment from $NVENV..."
  # shellcheck source=/dev/null
  source "$NVENV"
fi

# Install production dependencies if package.json exists
if [ -f "$BACKEND_DEST/package.json" ]; then
  echo "📦 Installing backend production dependencies..."
  npm install --prefix "$BACKEND_DEST" --omit=dev --no-audit --no-fund --no-package-lock 2>/dev/null || true
fi

# Verify backend compiled dist exists
if [ ! -f "$BACKEND_DEST/dist/server.js" ]; then
  echo "⚠️ Warning: $BACKEND_DEST/dist/server.js missing! Attempting compilation..."
  npx tsc -p "$BACKEND_DEST/tsconfig.json" 2>/dev/null || true
fi

# Signal cPanel Phusion Passenger to automatically reload the app
/bin/mkdir -p "$BACKEND_DEST/tmp"
touch "$BACKEND_DEST/tmp/restart.txt"

echo "=================================================="
echo "🎉 Deployment completed successfully!"
echo "   Frontend: $DEST"
echo "   Backend:  $BACKEND_DEST"
echo "=================================================="
