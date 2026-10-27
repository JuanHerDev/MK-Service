#!/bin/sh
set -e

# 1) Migration and seeds
alembic upgrade head
python scripts/seed_catalogs.py
python scripts/ensure_payload_files.py

# 2) Start worker if RUN_WORKER is true (default)
if [ "${RUN_WORKER:-true}" = "true" ]; then
  rq worker mk_campaigns --url "$REDIS_URL" &
fi

# 3) Start the server
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
