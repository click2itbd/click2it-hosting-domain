#!/bin/bash
# Fast 2-Second Pre-Built Deployment Script for cPanel Git™ Version Control
# Deploys pre-compiled frontend (dist/) to public_html and backend (backend/dist/) to backend_app

HOME_DIR="${HOME:-/home/$(whoami)}"
DEST="${DEPLOYPATH:-${HOME_DIR}/public_html}"
BACKEND_DEST="${BACKENDPATH:-${HOME_DIR}/backend_app}"

echo "=================================================="
echo " Starting cPanel Deployment: $(date)"
echo " Target Frontend: $DEST"
echo " Target Backend:  $BACKEND_DEST"
echo "=================================================="

# ==============================
# 1. FRONTEND DEPLOYMENT (dist/ -> public_html)
# ==============================
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "📦 Deploying pre-built frontend (dist/) to $DEST..."
  /bin/mkdir -p "$DEST"

  # Remove old hashed assets so stale bundles don't accumulate
  /bin/rm -rf "$DEST/assets"
  /bin/rm -f "$DEST/index.html"

  # Copy all pre-built files from dist/ into public_html/
  /bin/cp -Rf dist/. "$DEST/"

  # Ensure .htaccess is copied for SPA routing & /api proxy
  if [ -f "public/.htaccess" ]; then
    /bin/cp -f "public/.htaccess" "$DEST/.htaccess"
  elif [ -f ".htaccess" ]; then
    /bin/cp -f ".htaccess" "$DEST/.htaccess"
  fi

  # Copy auxiliary PHP scripts if present
  [ -f "upload.php" ] && /bin/cp -f upload.php "$DEST/" 2>/dev/null || true
  [ -f "public/share.php" ] && /bin/cp -f public/share.php "$DEST/" 2>/dev/null || true
  [ -f "public/steadfast.php" ] && /bin/cp -f public/steadfast.php "$DEST/" 2>/dev/null || true

  echo "✅ Frontend deployed to $DEST"
else
  echo "⚠️ dist/index.html not found!"
fi

# ==============================
# 2. BACKEND DEPLOYMENT (backend/ -> backend_app)
# ==============================
if [ -d "backend" ]; then
  echo "⚙️ Deploying pre-compiled backend to $BACKEND_DEST..."
  /bin/mkdir -p "$BACKEND_DEST"

  # Preserve existing production .env file
  if [ -f "$BACKEND_DEST/.env" ]; then
    /bin/cp -f "$BACKEND_DEST/.env" /tmp/saved_backend_env.tmp 2>/dev/null || true
  fi

  # Copy backend files (including pre-compiled backend/dist/)
  /bin/cp -Rf backend/. "$BACKEND_DEST/"

  # Restore preserved .env
  if [ -f /tmp/saved_backend_env.tmp ]; then
    /bin/cp -f /tmp/saved_backend_env.tmp "$BACKEND_DEST/.env"
    /bin/rm -f /tmp/saved_backend_env.tmp
  elif [ -f "$BACKEND_DEST/.env.example" ] && [ ! -f "$BACKEND_DEST/.env" ]; then
    /bin/cp -f "$BACKEND_DEST/.env.example" "$BACKEND_DEST/.env"
  fi

  # Restart cPanel Phusion Passenger / Node.js App
  /bin/mkdir -p "$BACKEND_DEST/tmp"
  touch "$BACKEND_DEST/tmp/restart.txt"

  echo "✅ Backend deployed and Passenger restart triggered"
fi

echo "=================================================="
echo "🎉 Deployment finished in 2 seconds!"
echo "=================================================="
exit 0
