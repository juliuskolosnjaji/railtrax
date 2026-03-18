#!/bin/bash
# Railtrax deployment script
# Run this on the server instead of plain "git pull"
#
# First-time setup:
#   sudo mkdir -p /etc/railtrax
#   sudo cp .env.production /etc/railtrax/.env.production
#   sudo chmod 600 /etc/railtrax/.env.production
#   sudo chown railtrax:railtrax /etc/railtrax/.env.production
#   bash scripts/deploy.sh

set -e

RAILTRAX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="/etc/railtrax/.env.production"
ENV_LINK="$RAILTRAX_DIR/.env.production"

echo "==> Railtrax deploy"

# ── 1. Ensure env file exists outside the repo ─────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Create it first:"
  echo "  sudo mkdir -p /etc/railtrax"
  echo "  sudo nano /etc/railtrax/.env.production"
  echo "  sudo chmod 600 /etc/railtrax/.env.production"
  exit 1
fi

# ── 2. Ensure symlink is in place ───────────────────────────────────────────
if [ ! -L "$ENV_LINK" ]; then
  echo "==> Creating symlink $ENV_LINK -> $ENV_FILE"
  ln -sf "$ENV_FILE" "$ENV_LINK"
fi

# ── 3. Pull latest code ─────────────────────────────────────────────────────
echo "==> git pull"
cd "$RAILTRAX_DIR"
git pull

# ── 4. Re-create symlink in case git pull removed it ───────────────────────
if [ ! -L "$ENV_LINK" ]; then
  echo "==> Re-creating symlink after git pull"
  ln -sf "$ENV_FILE" "$ENV_LINK"
fi

# ── 5. Install dependencies ─────────────────────────────────────────────────
echo "==> npm install"
npm install --omit=dev

# ── 6. Build ────────────────────────────────────────────────────────────────
echo "==> npm run build"
npm run build

# ── 7. Restart service ──────────────────────────────────────────────────────
if systemctl is-active --quiet railtrax; then
  echo "==> systemctl restart railtrax"
  systemctl restart railtrax
else
  echo "==> systemctl start railtrax"
  systemctl start railtrax
fi

echo "==> Done"
