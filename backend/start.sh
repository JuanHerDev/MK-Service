#!/bin/sh
set -e

echo "[mk] migrate..."
alembic upgrade head

echo "[mk] seed catalogs (idempotent)..."
python scripts/seed_catalogs.py || true

echo "[mk] ensure global payload files (idempotent)..."
python scripts/ensure_payload_files.py || true

# Full control pack + corp synthetic docs when present (idempotent upserts)
if [ -f scripts/seed_control_payloads.py ]; then
  echo "[mk] seed control payloads (idempotent)..."
  python scripts/seed_control_payloads.py || true
fi

if [ "${RUN_WORKER:-true}" = "true" ]; then
  echo "[mk] starting RQ worker..."
  rq worker mk_campaigns --url "${REDIS_URL}" &
fi

echo "[mk] starting API on ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
