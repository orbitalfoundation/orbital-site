#!/bin/bash
# Cron-polled auto-deploy across the site + all engine repos. On any new
# commit: pull everything, reinstall + rebuild (inside the node container),
# restart the app.
set -e
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="/tmp/orbital-deploy.lock"
MARKER="$SITE_DIR/.last-deployed"
REPOS=". ../orbital-bus ../orbital-filespace ../orbital-streams ../orbital-store ../orbital-server"

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$SITE_DIR"

if [ -f "$LOCK" ]; then
  echo "[$(date)] deploy already in progress, skipping"
  exit 0
fi
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

STATE=""
for r in $REPOS; do
  git -C "$r" fetch -q origin main 2>/dev/null || true
  STATE="$STATE $(git -C "$r" rev-parse origin/main 2>/dev/null)"
done
STATE_HASH=$(echo "$STATE" | shasum | cut -d' ' -f1)

if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$STATE_HASH" ]; then
  exit 0
fi

echo "[$(date)] changes detected — pulling all repos"
for r in $REPOS; do
  git -C "$r" pull -q origin main || echo "[$(date)] WARN: pull failed for $r"
done

echo "[$(date)] installing + building"
bash scripts/install.sh > /tmp/orbital-build.log 2>&1

echo "[$(date)] restarting app"
docker compose up -d mongo
docker compose restart app

echo "$STATE_HASH" > "$MARKER"
echo "[$(date)] deploy complete"
