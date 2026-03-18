#!/bin/sh
# Falha o container se o schema não sincronizar (evita P2022 em produção).
set -e
cd /app 2>/dev/null || true

echo "[sigacon] Prisma db push (sincroniza colunas/tabelas com o schema)..."
if ! ./node_modules/.bin/prisma db push --schema=./prisma/schema.prisma --skip-generate; then
  echo "[sigacon] ERRO: db push falhou. Verifique DATABASE_URL e logs acima."
  echo "[sigacon] No Railway: abra Shell no serviço e rode: npx prisma db push"
  exit 1
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Iniciando Next.js..."
exec node server.js
