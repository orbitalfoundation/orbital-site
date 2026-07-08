#!/bin/bash
# One-time setup on a deploy host (assumes: this repo cloned into a dedicated
# parent folder, docker present). Clones the engine packages as SIBLINGS of
# this repo, installs everything inside a node container, builds the web app,
# and starts the stack. Secrets live in ./.env (UNSPLASH_ACCESS,
# VITE_WEB3AUTH_CLIENT_ID) — vite and the server both read the same file.
set -e
cd "$(dirname "$0")/.."
SITE_DIR="$(pwd)"
PARENT="$(dirname "$SITE_DIR")"

ENGINES="orbital-bus orbital-filespace orbital-streams orbital-store orbital-server"

for repo in $ENGINES; do
  if [ ! -d "$PARENT/$repo/.git" ]; then
    git -C "$PARENT" clone "https://github.com/orbitalfoundation/$repo.git"
  fi
done

bash scripts/install.sh

docker compose up -d
echo
echo "setup complete. auto-deploy: add to crontab —"
echo "  * * * * * $SITE_DIR/scripts/deploy.sh >> /tmp/orbital-deploy.log 2>&1"
