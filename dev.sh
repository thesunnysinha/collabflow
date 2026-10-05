#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  # Random per-checkout values; nothing secret-shaped is committed.
  sed -i "s/^NODE_ENV=.*/NODE_ENV=development/; s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/; s/^MONGO_PASSWORD=.*/MONGO_PASSWORD=$(openssl rand -hex 16)/" .env
  echo "Created .env with development defaults."
fi

if ! grep -qE '^GITHUB_CLIENT_ID=.+' .env || ! grep -qE '^GITHUB_CLIENT_SECRET=.+' .env; then
  cat >&2 <<'MSG'
Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env first.
Create a GitHub OAuth App (Settings > Developer settings > OAuth Apps) with:
  Homepage URL:               http://localhost:3000
  Authorization callback URL: http://localhost:3000/api/auth/github/callback
MSG
  exit 1
fi

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build "$@"
