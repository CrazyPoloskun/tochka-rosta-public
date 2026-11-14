#!/bin/sh

echo "==> Waiting for PostgreSQL on ${POSTGRES_SERVER:-db}:${POSTGRES_PORT:-5432}..."
until python -c "
import socket, os, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect((os.environ.get('POSTGRES_SERVER', 'db'), int(os.environ.get('POSTGRES_PORT', 5432))))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  echo "PostgreSQL is not ready yet - retrying in 1s..."
  sleep 1
done

echo "==> Running database migrations..."
alembic upgrade head || echo "==> Alembic upgrade head warning (continuing to uvicorn)..."

echo "==> Starting FastAPI with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
