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

  # Ensure .htaccess is copied for SPA routing & /api proxy, preserving any CloudLinux Passenger config
  HTACCESS_SRC=""
  if [ -f "public/.htaccess" ]; then
    HTACCESS_SRC="public/.htaccess"
  elif [ -f ".htaccess" ]; then
    HTACCESS_SRC=".htaccess"
  fi

  if [ -n "$HTACCESS_SRC" ]; then
    PASSENGER_CONFIG=""
    if [ -f "$DEST/.htaccess" ]; then
      PASSENGER_CONFIG=$(sed -n '/# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN/,/# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END/p' "$DEST/.htaccess" 2>/dev/null || true)
    fi

    /bin/cp -f "$HTACCESS_SRC" "$DEST/.htaccess"

    if [ -n "$PASSENGER_CONFIG" ]; then
      echo "" >> "$DEST/.htaccess"
      echo "$PASSENGER_CONFIG" >> "$DEST/.htaccess"
      echo "  (Preserved CloudLinux Passenger configuration in .htaccess)"
    fi
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

  # Ensure dependencies are installed if missing
  if [ ! -d "$BACKEND_DEST/node_modules" ]; then
    echo "📦 Installing production dependencies in $BACKEND_DEST..."
    (cd "$BACKEND_DEST" && npm install --omit=dev --no-audit --no-fund 2>/dev/null || true)
  fi

  # Restart cPanel Phusion Passenger
  /bin/mkdir -p "$BACKEND_DEST/tmp"
  touch "$BACKEND_DEST/tmp/restart.txt" 2>/dev/null || true
  /bin/mkdir -p "${HOME_DIR}/click2it.bd/tmp"
  touch "${HOME_DIR}/click2it.bd/tmp/restart.txt" 2>/dev/null || true
  /bin/mkdir -p "${DEST}/tmp"
  touch "${DEST}/tmp/restart.txt" 2>/dev/null || true

  # Ensure PM2 reloads if available
  if command -v pm2 >/dev/null 2>&1; then
    (cd "$BACKEND_DEST" && pm2 reload click2it-api 2>/dev/null || pm2 restart click2it-api 2>/dev/null || pm2 start server.js --name click2it-api 2>/dev/null || true)
  elif command -v npx >/dev/null 2>&1; then
    (cd "$BACKEND_DEST" && npx pm2 reload click2it-api 2>/dev/null || npx pm2 restart click2it-api 2>/dev/null || true)
  fi

  # Fallback: If port 4001 is not answering, spawn standalone server on port 4001
  if ! curl -s --max-time 2 http://127.0.0.1:4001/api/health >/dev/null 2>&1; then
    NODE_BIN="$(command -v node 2>/dev/null || find "$HOME_DIR/nodevenv" -name node -type f -print -quit 2>/dev/null || echo "")"
    if [ -n "$NODE_BIN" ]; then
      echo "🚀 Spawning backend on port 4001 using $NODE_BIN..."
      (cd "$BACKEND_DEST" && NODE_ENV=production PORT=4001 nohup "$NODE_BIN" server.js > "$BACKEND_DEST/backend.log" 2>&1 &)
      sleep 1
    fi
  fi

  echo "✅ Backend deployed and restarted (Passenger & 4001 listener)"
fi

echo "=================================================="
echo "🎉 Deployment finished!"
echo "=================================================="
exit 0
