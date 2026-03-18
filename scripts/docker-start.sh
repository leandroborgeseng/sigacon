#!/bin/sh
# Falha o container se o schema não sincronizar (evita P2022 em produção).
set -e
cd /app 2>/dev/null || true

# --accept-data-loss: Prisma exige ao adicionar índice único em anexos.lancamento_ust_id (1 evidência por lançamento UST).
echo "[sigacon] Prisma db push..."
if ! ./node_modules/.bin/prisma db push \
  --schema=./prisma/schema.prisma \
  --skip-generate \
  --accept-data-loss; then
  echo "[sigacon] ERRO: db push falhou."
  echo "[sigacon] Se falhar por duplicata em anexos.lancamento_ust_id, no Postgres: DELETE duplicatas mantendo um anexo por lançamento."
  exit 1
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Iniciando Next.js..."
exec node server.js
