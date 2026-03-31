/**
 * Gera o SQL de INSERT do usuário admin para executar direto no banco.
 * Uso: node scripts/gerar-insert-admin.js
 * Requer: npm install (bcryptjs já está nas deps do projeto)
 */
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

// CUID-like id (25 chars, começa com 'c')
function cuid() {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(12).toString("base36").slice(0, 12);
  return "c" + timestamp + random;
}

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 10);
  const id = cuid();
  const now = new Date().toISOString();

  const sql = `
-- Usuário admin: admin@lex.local / admin123
-- Execute no PostgreSQL (Railway, Prisma Studio, psql, etc.)

INSERT INTO usuarios (id, nome, email, senha_hash, perfil, ativo, criado_em, atualizado_em)
VALUES (
  '${id}',
  'Administrador',
  'admin@lex.local',
  '${senhaHash}',
  'ADMIN',
  true,
  '${now}',
  '${now}'
)
ON CONFLICT (email) DO UPDATE SET
  senha_hash = EXCLUDED.senha_hash,
  ativo = true,
  atualizado_em = EXCLUDED.atualizado_em;
`.trim();

  console.log(sql);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
