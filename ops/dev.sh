#!/usr/bin/env bash
# Brings the whole local stack up: containers, area seed, API, web client and
# web admin.
#
# One command because the pieces have an order: the API will not start without a
# database, and creating anything needs the six Da Nang areas seeded. Getting
# that order wrong looks like a broken app rather than a missing step.
#
# Ctrl+C stops the API and both web servers; the containers keep running so the
# next start is instant. `pnpm db:down` stops those.
set -euo pipefail
# Job control: each `&` job below becomes its own process group, so `stop()`
# can kill the group (`kill -- -PID`) instead of one PID. Without this, `next
# dev`'s own `next-server` child (or vite-node's watcher) survives Ctrl+C —
# only the `sed` prefixing its output would die, and the real server would
# leak past this script's exit, still holding its port.
set -m

# apps/web-admin-side's own `dev` script hardcodes `-p 3002`, which this
# machine's other project already occupies. Overriding here (rather than
# editing that package.json) lets `ADMIN_PORT=3010 ops/dev.sh` reroute it
# without changing anything web-admin's own `pnpm dev` does.
ADMIN_PORT="${ADMIN_PORT:-3002}"

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

# All three dev servers are started here rather than through `turbo run dev`,
# which needs a real pnpm binary on PATH and fails under a Corepack-only install.
pids=()
stop() {
  trap - INT TERM EXIT
  echo
  echo "==> stopping"
  # Negative PID targets the whole process group (see `set -m` above), which
  # is what actually reaches a dev server's own child processes.
  for pid in "${pids[@]}"; do kill -- "-$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap stop INT TERM EXIT

# Each server is redirected with `> >(sed ...)` rather than piped with `|`, so
# `$!` below is the server's own PID (the pipeline's process-group leader),
# not the trailing `sed`'s — see `stop()`.
echo "==> api"
"${PNPM[@]}" --filter @dnc/api dev > >(sed 's/^/[api] /') 2>&1 &
pids+=($!)

echo "==> web"
"${PNPM[@]}" --filter @dnc/web-client dev > >(sed 's/^/[web] /') 2>&1 &
pids+=($!)

echo "==> web admin"
# Invoked as `next dev -p <port>` directly (bypassing the package.json `dev`
# script) so ADMIN_PORT can override the port without touching
# apps/web-admin-side/package.json, which web-admin-agent owns.
"${PNPM[@]}" --filter @dnc/web-admin exec next dev -p "$ADMIN_PORT" > >(sed 's/^/[admin] /') 2>&1 &
pids+=($!)

cat <<BANNER

  Web   http://localhost:3000
  Admin http://localhost:${ADMIN_PORT}
  API   http://localhost:3101      (docs: /api/docs)
  MinIO http://localhost:9003      (console)

  Ctrl+C stops the app; containers keep running.

BANNER

wait
