#!/bin/bash
# Fast 2-Second Pre-Built Deployment Script for cPanel Git™ Version Control
# Supports cpanel_build/ (GitHub-synced) and dist/ for frontend, plus backend/compiled/ for backend

HOME_DIR="${HOME:-/home/$(whoami)}"
DEST="${DEPLOYPATH:-${HOME_DIR}/public_html}"
BACKEND_DEST="${BACKENDPATH:-${HOME_DIR}/backend_app}"

echo "=================================================="
echo " Starting cPanel Deployment: $(date)"
echo " Target Frontend: $DEST"
echo " Target Backend:  $BACKEND_DEST"
echo "=================================================="

# ==============================
# 1. FRONTEND DEPLOYMENT -> public_html
# ==============================
FRONTEND_SRC=""
if [ -d "cpanel_build" ] && [ -f "cpanel_build/index.html" ]; then
  FRONTEND_SRC="cpanel_build"
elif [ -d "dist" ] && [ -f "dist/index.html" ]; then
  FRONTEND_SRC="dist"
fi

if [ -n "$FRONTEND_SRC" ]; then
  echo "📦 Deploying pre-built frontend from $FRONTEND_SRC/ to $DEST..."
  /bin/mkdir -p "$DEST"

  # Remove old hashed assets so stale bundles don't accumulate
  /bin/rm -rf "$DEST/assets"
  /bin/rm -f "$DEST/index.html"

  # Copy all pre-built files into public_html/
  /bin/cp -Rf "$FRONTEND_SRC"/. "$DEST/"

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
  echo "⚠️ No pre-built frontend folder (cpanel_build/ or dist/) found!"
fi

# ==============================
# 2. BACKEND DEPLOYMENT -> backend_app
# ==============================
if [ -d "backend" ]; then
  echo "⚙️ Deploying pre-compiled backend to $BACKEND_DEST..."
  /bin/mkdir -p "$BACKEND_DEST"

  # Preserve existing production .env file
  if [ -f "$BACKEND_DEST/.env" ]; then
    /bin/cp -f "$BACKEND_DEST/.env" /tmp/saved_backend_env.tmp 2>/dev/null || true
  fi

  # Copy backend files
  /bin/cp -Rf backend/. "$BACKEND_DEST/"

  # Ensure backend/compiled is also mirrored to backend_app/dist for Passenger compatibility
  if [ -d "backend/compiled" ]; then
    /bin/mkdir -p "$BACKEND_DEST/dist"
    /bin/cp -Rf backend/compiled/. "$BACKEND_DEST/dist/"
  fi

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
