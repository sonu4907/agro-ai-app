#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - build frontend, copy to webroot, install backend deps, restart services
# Usage: adjust variables below or set environment variables before running.

# Configuration (override by exporting env vars)
REPO_DIR=${REPO_DIR:-"$(dirname "$(readlink -f "$0")")/.."}
FRONTEND_DIR=${FRONTEND_DIR:-"$REPO_DIR/frontend"}
VENV_DIR=${VENV_DIR:-"/home/username/venv"}
WWW_DIR=${WWW_DIR:-"/var/www/myapp"}
SERVICE_NAME=${SERVICE_NAME:-"agro-ml.service"}
NGINX_RELOAD=${NGINX_RELOAD:-true}

echo "Repo: $REPO_DIR"
echo "Frontend: $FRONTEND_DIR"
echo "Virtualenv: $VENV_DIR"
echo "Web root: $WWW_DIR"

cd "$FRONTEND_DIR"
if [ -f package.json ]; then
  echo "Installing frontend deps and building..."
  npm ci
  npm run build
else
  echo "No package.json found in $FRONTEND_DIR — skipping frontend build"
fi

if [ -d "$FRONTEND_DIR/dist" ]; then
  echo "Copying built frontend to $WWW_DIR"
  sudo mkdir -p "$WWW_DIR"
  sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$WWW_DIR/"
  sudo chown -R www-data:www-data "$WWW_DIR"
else
  echo "No dist directory found; frontend not deployed."
fi

cd "$REPO_DIR"
if [ -f requirements.txt ]; then
  echo "Installing Python dependencies into venv: $VENV_DIR"
  if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
    pip install -r requirements.txt
    pip install gunicorn uvicorn || true
  else
    echo "Virtualenv not found at $VENV_DIR — skipping pip install"
  fi
fi

echo "Reloading systemd and restarting $SERVICE_NAME"
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"

if [ "$NGINX_RELOAD" = true ]; then
  echo "Reloading nginx"
  sudo systemctl reload nginx || echo "nginx reload failed; check nginx config"
fi

echo "Deploy complete."
