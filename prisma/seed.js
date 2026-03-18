/**
 * Seed em JavaScript puro (node) para rodar no Railway sem tsx.
 * Catálogo UST conforme seções 4.1–4.11 (contrato tipo prefeitura/SERPRO).
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

/** Catálogo oficial: serviço, complexidade, UST, categoria (4.x) */
const CATALOGO_UST = [
  // 4.1 Manutenção Corretiva
  { codigo: "CAT_4_1_01", categoria: "4.1 Manutenção Corretiva", nome: "Correção de erro simples", complexidade: "Baixa", ust: 2, ordem: 110 },
  { codigo: "CAT_4_1_02", categoria: "4.1 Manutenção Corretiva", nome: "Correção de bug com impacto funcional", complexidade: "Média", ust: 4, ordem: 111 },
  { codigo: "CAT_4_1_03", categoria: "4.1 Manutenção Corretiva", nome: "Correção crítica (indisponibilidade)", complexidade: "Alta", ust: 6, ordem: 112 },
  // 4.2 Manutenção Evolutiva
  { codigo: "CAT_4_2_01", categoria: "4.2 Manutenção Evolutiva", nome: "Inclusão de campo", complexidade: "Baixa", ust: 2, ordem: 201 },
  { codigo: "CAT_4_2_02", categoria: "4.2 Manutenção Evolutiva", nome: "Ajuste de interface", complexidade: "Baixa", ust: 2, ordem: 202 },
  { codigo: "CAT_4_2_03", categoria: "4.2 Manutenção Evolutiva", nome: "Nova validação", complexidade: "Média", ust: 4, ordem: 203 },
  { codigo: "CAT_4_2_04", categoria: "4.2 Manutenção Evolutiva", nome: "Alteração funcional", complexidade: "Média", ust: 6, ordem: 204 },
  { codigo: "CAT_4_2_05", categoria: "4.2 Manutenção Evolutiva", nome: "Nova funcionalidade (CRUD)", complexidade: "Média", ust: 8, ordem: 205 },
  { codigo: "CAT_4_2_06", categoria: "4.2 Manutenção Evolutiva", nome: "Regra complexa", complexidade: "Alta", ust: 10, ordem: 206 },
  // 4.3 Relatórios e BI
  { codigo: "CAT_4_3_01", categoria: "4.3 Relatórios e BI", nome: "Relatório simples", complexidade: "Baixa", ust: 3, ordem: 301 },
  { codigo: "CAT_4_3_02", categoria: "4.3 Relatórios e BI", nome: "Relatório com filtros", complexidade: "Média", ust: 6, ordem: 302 },
  { codigo: "CAT_4_3_03", categoria: "4.3 Relatórios e BI", nome: "Dashboard", complexidade: "Alta", ust: 10, ordem: 303 },
  // 4.4 Integrações
  { codigo: "CAT_4_4_01", categoria: "4.4 Integrações", nome: "API simples", complexidade: "Média", ust: 8, ordem: 401 },
  { codigo: "CAT_4_4_02", categoria: "4.4 Integrações", nome: "API com autenticação", complexidade: "Média", ust: 10, ordem: 402 },
  { codigo: "CAT_4_4_03", categoria: "4.4 Integrações", nome: "Integração complexa (HL7, mensageria)", complexidade: "Alta", ust: 15, ordem: 403 },
  // 4.5 Banco de Dados
  { codigo: "CAT_4_5_01", categoria: "4.5 Banco de Dados", nome: "Ajuste de query", complexidade: "Baixa", ust: 2, ordem: 501 },
  { codigo: "CAT_4_5_02", categoria: "4.5 Banco de Dados", nome: "Procedure", complexidade: "Média", ust: 5, ordem: 502 },
  { codigo: "CAT_4_5_03", categoria: "4.5 Banco de Dados", nome: "Modelagem", complexidade: "Alta", ust: 8, ordem: 503 },
  // 4.6 DevOps e Infraestrutura
  { codigo: "CAT_4_6_01", categoria: "4.6 DevOps e Infraestrutura", nome: "Ajuste pipeline", complexidade: "Média", ust: 4, ordem: 601 },
  { codigo: "CAT_4_6_02", categoria: "4.6 DevOps e Infraestrutura", nome: "Nova pipeline", complexidade: "Média", ust: 6, ordem: 602 },
  { codigo: "CAT_4_6_03", categoria: "4.6 DevOps e Infraestrutura", nome: "Deploy estruturado", complexidade: "Alta", ust: 8, ordem: 603 },
  // 4.7 Documentação
  { codigo: "CAT_4_7_01", categoria: "4.7 Documentação", nome: "Documentação simples", complexidade: "Baixa", ust: 2, ordem: 701 },
  { codigo: "CAT_4_7_02", categoria: "4.7 Documentação", nome: "Documentação técnica", complexidade: "Média", ust: 5, ordem: 702 },
  { codigo: "CAT_4_7_03", categoria: "4.7 Documentação", nome: "Manual usuário", complexidade: "Média", ust: 4, ordem: 703 },
  // 4.8 Testes (SERPRO)
  { codigo: "CAT_4_8_01", categoria: "4.8 Testes (SERPRO)", nome: "Teste funcional simples", complexidade: "Baixa", ust: 2, ordem: 801 },
  { codigo: "CAT_4_8_02", categoria: "4.8 Testes (SERPRO)", nome: "Teste integrado", complexidade: "Média", ust: 4, ordem: 802 },
  { codigo: "CAT_4_8_03", categoria: "4.8 Testes (SERPRO)", nome: "Teste de regressão completo", complexidade: "Alta", ust: 6, ordem: 803 },
  // 4.9 Segurança
  { codigo: "CAT_4_9_01", categoria: "4.9 Segurança", nome: "Ajuste básico de segurança", complexidade: "Baixa", ust: 3, ordem: 901 },
  { codigo: "CAT_4_9_02", categoria: "4.9 Segurança", nome: "Implementação de autenticação/autorização", complexidade: "Média", ust: 6, ordem: 902 },
  { codigo: "CAT_4_9_03", categoria: "4.9 Segurança", nome: "Correção de vulnerabilidade crítica", complexidade: "Alta", ust: 10, ordem: 903 },
  // 4.10 UX / Front-end
  { codigo: "CAT_4_10_01", categoria: "4.10 UX / Front-end", nome: "Ajuste visual simples", complexidade: "Baixa", ust: 2, ordem: 1001 },
  { codigo: "CAT_4_10_02", categoria: "4.10 UX / Front-end", nome: "Melhoria de usabilidade", complexidade: "Média", ust: 4, ordem: 1002 },
  { codigo: "CAT_4_10_03", categoria: "4.10 UX / Front-end", nome: "Redesign de tela", complexidade: "Alta", ust: 8, ordem: 1003 },
  // 4.11 Sustentação contínua
  { codigo: "CAT_4_11_01", categoria: "4.11 Sustentação contínua", nome: "Atendimento de incidente", complexidade: "Baixa", ust: 2, ordem: 1101 },
  { codigo: "CAT_4_11_02", categoria: "4.11 Sustentação contínua", nome: "Análise de problema", complexidade: "Média", ust: 4, ordem: 1102 },
  { codigo: "CAT_4_11_03", categoria: "4.11 Sustentação contínua", nome: "Atuação preventiva", complexidade: "Média", ust: 5, ordem: 1103 },
];

const CODIGOS_LEGADOS_DESATIVAR = [
  "UST_API_REST",
  "UST_CRUD_TELA",
  "UST_CORRECAO_BUG",
  "UST_DOC_TECNICA",
  "UST_INTEGRACAO",
];

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

    for (const t of CATALOGO_UST) {
      await prisma.tipoAtividadeUst.upsert({
        where: { codigo: t.codigo },
        update: {
          nome: t.nome,
          categoria: t.categoria,
          complexidade: t.complexidade,
          ustFixo: t.ust,
          ordem: t.ordem,
          ativo: true,
        },
        create: {
          codigo: t.codigo,
          nome: t.nome,
          categoria: t.categoria,
          complexidade: t.complexidade,
          ustFixo: t.ust,
          ordem: t.ordem,
          ativo: true,
        },
      });
    }

    await prisma.tipoAtividadeUst.updateMany({
      where: { codigo: { in: CODIGOS_LEGADOS_DESATIVAR } },
      data: { ativo: false },
    });

    console.log(
      "[seed] Catálogo UST (4.1–4.11):",
      CATALOGO_UST.length,
      "itens. Tipos legados desativados:",
      CODIGOS_LEGADOS_DESATIVAR.length
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed] Erro:", e);
  process.exit(1);
});
