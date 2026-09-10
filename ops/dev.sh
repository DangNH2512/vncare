#!/usr/bin/env bash
# Brings the whole local stack up: containers, area seed, API and web.
#
# One command because the pieces have an order: the API will not start without a
# database, and creating anything needs the six Da Nang areas seeded. Getting
# that order wrong looks like a broken app rather than a missing step.
#
# Ctrl+C stops the API and the web server; the containers keep running so the
# next start is instant. `pnpm db:down` stops those.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# pnpm is not always on PATH — a Corepack-managed install exposes it only
# through `corepack`. Resolve it once rather than assuming a bare binary.
if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm)
else
  echo "Neither pnpm nor corepack is on PATH." >&2
  exit 1
fi

echo "==> containers"
docker compose -f docker-compose.local.yml up -d postgres minio

echo "==> waiting for postgres"
for _ in $(seq 1 60); do
  if docker exec vncare-postgres-1 pg_isready -U dnc >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec vncare-postgres-1 pg_isready -U dnc >/dev/null

echo "==> seeding areas"
# Idempotent: re-running updates the six rows in place rather than duplicating.
"${PNPM[@]}" --filter @dnc/api seed:areas

# Both processes are started here rather than through `turbo run dev`, which
# needs a real pnpm binary on PATH and fails under a Corepack-only install.
pids=()
stop() {
  trap - INT TERM EXIT
  echo
  echo "==> stopping"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap stop INT TERM EXIT

echo "==> api"
"${PNPM[@]}" --filter @dnc/api dev 2>&1 | sed 's/^/[api] /' &
pids+=($!)

echo "==> web"
"${PNPM[@]}" --filter @dnc/web-client dev 2>&1 | sed 's/^/[web] /' &
pids+=($!)

cat <<'BANNER'

  Web   http://localhost:3000
  API   http://localhost:3101      (docs: /api/docs)
  MinIO http://localhost:9003      (console)

  Ctrl+C stops the app; containers keep running.

BANNER

wait
