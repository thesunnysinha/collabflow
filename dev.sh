#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  # Random per-checkout values; nothing secret-shaped is committed.
  sed -i "s/^NODE_ENV=.*/NODE_ENV=development/; s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/; s/^MONGO_PASSWORD=.*/MONGO_PASSWORD=$(openssl rand -hex 16)/" .env
  echo "Created .env with development defaults."
fi

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build "$@"
