#!/bin/sh
# Aplica migrações pendentes antes do Next (Railway / Docker).
#
# P3005 / “database schema is not empty”: baseline automático (resolve --applied + deploy de novo).
# Opcional: PRISMA_BASELINE_NON_EMPTY_DB=1 força baseline se migrate falhar por outro motivo.
set -e
cd /app 2>/dev/null || true

echo "[sigacon] docker-start.sh build-marker=baseline-v2-filegrep"

run_baseline_migrations() {
  echo "[sigacon] Baseline: registrando migrações como já aplicadas (banco já existia sem histórico Prisma)."
  for d in ./prisma/migrations/*/; do
    if [ ! -d "$d" ]; then
      continue
    fi
    m=$(basename "$d")
    echo "[sigacon] prisma migrate resolve --applied \"$m\""
    ./node_modules/.bin/prisma migrate resolve --applied "$m" --schema=./prisma/schema.prisma
  done
}

MIGRATE_LOG=/tmp/prisma_migrate_last.log
echo "[sigacon] Prisma migrate deploy..."
set +e
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma >"$MIGRATE_LOG" 2>&1
MIGRATE_EC=$?
set -e
cat "$MIGRATE_LOG"

if [ "$MIGRATE_EC" -eq 0 ]; then
  :
else
  NEED_BASELINE=0
  if grep -qE 'P3005|database schema is not empty|migrate-baseline' "$MIGRATE_LOG" 2>/dev/null; then
    NEED_BASELINE=1
  fi
  if [ "$NEED_BASELINE" -eq 1 ] || [ "$PRISMA_BASELINE_NON_EMPTY_DB" = "1" ]; then
    if [ "$NEED_BASELINE" -ne 1 ] && [ "$PRISMA_BASELINE_NON_EMPTY_DB" = "1" ]; then
      echo "[sigacon] Aviso: baseline forçado por PRISMA_BASELINE_NON_EMPTY_DB=1 (migrate não casou P3005 no log)."
    fi
    run_baseline_migrations
    echo "[sigacon] Prisma migrate deploy (após baseline)..."
    ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
  else
    echo "[sigacon] ERRO: migrate deploy falhou (código $MIGRATE_EC). Log em $MIGRATE_LOG não indicou P3005."
    echo "[sigacon] Se o banco já tinha tabelas sem _prisma_migrations, defina PRISMA_BASELINE_NON_EMPTY_DB=1 na Railway."
    exit 1
  fi
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Contrato datacenter base (8 linhas; SEED_CONTRATO_ID no ambiente opcional)..."
set +e
node scripts/seed-contrato-datacenter-base.js
SEED_DC_EC=$?
set -e
if [ "$SEED_DC_EC" -ne 0 ]; then
  echo "[sigacon] Aviso: seed-contrato-datacenter-base saiu com código $SEED_DC_EC (deploy segue)."
fi

echo "[sigacon] Iniciando Next.js..."
exec node server.js
