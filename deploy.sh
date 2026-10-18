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

  # Also terminate any stale standalone Node process holding port 4001 so the new build takes over
  fuser -k 4001/tcp 2>/dev/null || true
  lsof -ti:4001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  pkill -f "backend_app/dist/server.js" 2>/dev/null || true
  pkill -f "dist/server.js" 2>/dev/null || true

  sleep 1

  # Auto-detect CloudLinux nodevenv or system node and spawn standalone server on 4001 if not already listening
  if ! curl -s --max-time 2 http://127.0.0.1:4001/api/health >/dev/null 2>&1; then
    NVENV="$(find "$HOME_DIR/nodevenv" -name activate -path "*/backend_app/*" -print -quit 2>/dev/null || true)"
    if [ -n "$NVENV" ] && [ -f "$NVENV" ]; then
      # shellcheck source=/dev/null
      source "$NVENV"
    fi
    NODE_BIN="$(command -v node 2>/dev/null || find "$HOME_DIR/nodevenv" -name node -type f -print -quit 2>/dev/null || echo "")"
    if [ -n "$NODE_BIN" ] && [ -f "$BACKEND_DEST/dist/server.js" ]; then
      echo "🚀 Starting updated backend server on port 4001 using $NODE_BIN..."
      (cd "$BACKEND_DEST" && NODE_ENV=production PORT=4001 nohup "$NODE_BIN" dist/server.js > "$BACKEND_DEST/backend.log" 2>&1 &)
      sleep 1
    fi
  fi

  echo "✅ Backend deployed and restarted on port 4001"
fi

echo "=================================================="
echo "🎉 Deployment finished!"
echo "=================================================="
exit 0
