#!/bin/bash
# Install every package's dependencies and build the web app — inside the
# same node image the app runs on, so nothing needs node on the host.
set -e
cd "$(dirname "$0")/.."

docker compose run --rm app sh -c '
  set -e
  for p in ../orbital-bus ../orbital-filespace ../orbital-streams ../orbital-store ../orbital-server; do
    echo "== npm install: $p"
    (cd "$p" && npm install --no-audit --no-fund --loglevel=error)
  done
  echo "== npm install + build: orbital-site"
  npm install --no-audit --no-fund --loglevel=error
  npm run build
'
