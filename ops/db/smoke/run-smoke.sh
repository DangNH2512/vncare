#!/usr/bin/env bash
# Applies the invariant smoke test against the local compose database.
# Prerequisite: `pnpm db:up` and a healthy postgres container.
set -euo pipefail

cd "$(dirname "$0")/../../.."

docker compose -f docker-compose.local.yml exec -T postgres \
  psql -U dnc -d dnc -v ON_ERROR_STOP=1 < ops/db/smoke/rsvp-invariant.sql
