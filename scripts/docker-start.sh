#!/bin/sh
# Aplica migrações pendentes antes do Next (Railway / Docker).
# Não depende de SSH no ambiente: roda em todo deploy.
#
# P3005 (banco já tem tabelas, sem histórico em _prisma_migrations): defina na Railway
# PRISMA_BASELINE_NON_EMPTY_DB=1, faça UM deploy com sucesso e REMOVA a variável em seguida.
set -e
cd /app 2>/dev/null || true

run_migrate_deploy() {
  ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
}

echo "[sigacon] Prisma migrate deploy..."
if run_migrate_deploy; then
  :
else
  deploy_err=$?
  if [ "$PRISMA_BASELINE_NON_EMPTY_DB" = "1" ]; then
    echo "[sigacon] Baseline: registrando migrações em prisma/migrations como já aplicadas (use só se o schema do banco já bate com elas)."
    for d in ./prisma/migrations/*/; do
      if [ ! -d "$d" ]; then
        continue
      fi
      m=$(basename "$d")
      echo "[sigacon] prisma migrate resolve --applied \"$m\""
      ./node_modules/.bin/prisma migrate resolve --applied "$m" --schema=./prisma/schema.prisma
    done
    echo "[sigacon] Prisma migrate deploy (após baseline)..."
    run_migrate_deploy
  else
    echo "[sigacon] ERRO: migrate deploy falhou (código $deploy_err). Comum em bancos criados com db push: P3005 — schema não vazio sem _prisma_migrations."
    echo "[sigacon] Se as tabelas do banco já refletem prisma/migrations, defina PRISMA_BASELINE_NON_EMPTY_DB=1 na Railway, redeploy uma vez e remova a variável."
    exit 1
  fi
fi

echo "[sigacon] Seeds opcionais (ignoram falha)..."
node prisma/seed.js 2>/dev/null || true
node scripts/seed-eddydata.js 2>/dev/null || true

echo "[sigacon] Iniciando Next.js..."
exec node server.js
