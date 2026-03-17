/**
 * Seed em JavaScript puro (node) para rodar no Railway sem tsx.
 * Cria/atualiza o usuário admin. Inclui retry de conexão com o banco.
 */
const { PrismaClient, PerfilUsuario, RecursoPermissao } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = "admin@sigacon.local";
const ADMIN_SENHA = "admin123";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await prisma.$connect();
      return true;
    } catch (e) {
      console.warn(
        `[seed] Tentativa ${i + 1}/${MAX_RETRIES} de conexão com o banco falhou:`,
        e.message
      );
      if (i < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS);
    }
  }
  return false;
}

async function main() {
  const connected = await connectWithRetry();
  if (!connected) {
    console.error("[seed] Não foi possível conectar ao banco. Abortando seed.");
    process.exit(1);
  }

  try {
    const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
    const admin = await prisma.usuario.upsert({
      where: { email: ADMIN_EMAIL },
      update: { senhaHash, ativo: true },
      create: {
        nome: "Administrador",
        email: ADMIN_EMAIL,
        senhaHash,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      },
    });
    console.log("[seed] OK. Usuário admin:", admin.email, "| Senha:", ADMIN_SENHA);

    // Matriz padrão de permissões: perfil x recurso (visualizar / editar)
    const recursos = Object.values(RecursoPermissao);
    const defaults = {
      [PerfilUsuario.LEITOR]: (r) => ({ podeVisualizar: true, podeEditar: false }),
      [PerfilUsuario.AVALIADOR]: (r) => ({
        podeVisualizar: true,
        podeEditar: r === RecursoPermissao.ITENS,
      }),
      [PerfilUsuario.GESTOR]: (r) => ({
        podeVisualizar: true,
        podeEditar: r !== RecursoPermissao.USUARIOS,
      }),
      [PerfilUsuario.ADMIN]: () => ({ podeVisualizar: true, podeEditar: true }),
    };
    for (const perfil of Object.values(PerfilUsuario)) {
      for (const recurso of recursos) {
        const { podeVisualizar, podeEditar } = defaults[perfil](recurso);
        await prisma.permissaoPerfil.upsert({
          where: {
            perfil_recurso: { perfil, recurso },
          },
          update: { podeVisualizar, podeEditar },
          create: { perfil, recurso, podeVisualizar, podeEditar },
        });
      }
    }
    console.log("[seed] Permissões por perfil atualizadas.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed] Erro:", e);
  process.exit(1);
});
