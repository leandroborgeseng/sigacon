#!/bin/sh
# Aplica migrações pendentes antes do Next (Railway / Docker).
# Não depende de SSH no ambiente: roda em todo deploy.
set -e
cd /app 2>/dev/null || true

echo "[sigacon] Prisma migrate deploy..."
if ! ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma; then
  echo "[sigacon] ERRO: migrate deploy falhou. Verifique DATABASE_URL e as migrações em prisma/migrations."
  exit 1
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Iniciando Next.js..."
exec node server.js
