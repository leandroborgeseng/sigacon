#!/bin/sh
# Aplica migrações pendentes antes do Next (Railway / Docker).
#
# Se o Prisma retornar P3005 (banco já tem tabelas, sem _prisma_migrations), registramos
# as pastas em prisma/migrations como já aplicadas e rodamos deploy de novo — típico após db push.
# Opcional: PRISMA_BASELINE_NON_EMPTY_DB=1 força o mesmo baseline se migrate falhar por outro motivo
# (use com cuidado).
set -e
cd /app 2>/dev/null || true

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

echo "[sigacon] Prisma migrate deploy..."
set +e
MIGRATE_OUT=$(./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma 2>&1)
MIGRATE_EC=$?
set -e
printf '%s\n' "$MIGRATE_OUT"

if [ "$MIGRATE_EC" -eq 0 ]; then
  :
else
  P3005=0
  case "$MIGRATE_OUT" in
    *P3005*) P3005=1 ;;
  esac
  if [ "$P3005" -eq 1 ] || [ "$PRISMA_BASELINE_NON_EMPTY_DB" = "1" ]; then
    if [ "$P3005" -ne 1 ] && [ "$PRISMA_BASELINE_NON_EMPTY_DB" = "1" ]; then
      echo "[sigacon] Aviso: migrate falhou sem P3005; baseline forçado por PRISMA_BASELINE_NON_EMPTY_DB=1."
    fi
    run_baseline_migrations
    echo "[sigacon] Prisma migrate deploy (após baseline)..."
    ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
  else
    echo "[sigacon] ERRO: migrate deploy falhou (código $MIGRATE_EC). Se for P3005 e a mensagem não foi detectada, use PRISMA_BASELINE_NON_EMPTY_DB=1 na Railway."
    exit 1
  fi
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Iniciando Next.js..."
exec node server.js
