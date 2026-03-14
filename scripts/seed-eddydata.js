/**
 * Seed dos itens do contrato Eddydata para produção.
 * Cria o contrato e o módulo se não existirem e insere os itens de scripts/dados-eddydata.json
 *
 * Uso: DATABASE_URL="..." node scripts/seed-eddydata.js
 * Ou no Railway: pode ser chamado após o deploy (ex.: job ou comando manual).
 */
const path = require("path");
const fs = require("fs");
const { PrismaClient, StatusItem, StatusContrato } = require("@prisma/client");

const CONTRATO_NOME = "Eddydata";
const MODULO_NOME = "Requisitos do Projeto";
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
        `[seed-eddydata] Tentativa ${i + 1}/${MAX_RETRIES} de conexão:`,
        e.message
      );
      if (i < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS);
    }
  }
  return false;
}

function loadDados() {
  const jsonPath = path.join(__dirname, "dados-eddydata.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error("Arquivo scripts/dados-eddydata.json não encontrado.");
  }
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("dados-eddydata.json deve ser um array.");
  return data;
}

async function main() {
  const connected = await connectWithRetry();
  if (!connected) {
    console.error("[seed-eddydata] Não foi possível conectar ao banco.");
    process.exit(1);
  }

  const itens = loadDados();
  if (itens.length === 0) {
    console.log("[seed-eddydata] Nenhum item em dados-eddydata.json.");
    await prisma.$disconnect();
    return;
  }

  let contrato = await prisma.contrato.findFirst({
    where: {
      nome: { contains: CONTRATO_NOME, mode: "insensitive" },
      status: StatusContrato.ATIVO,
    },
  });

  if (!contrato) {
    const agora = new Date();
    const fim = new Date(agora);
    fim.setFullYear(fim.getFullYear() + 1);
    contrato = await prisma.contrato.create({
      data: {
        nome: CONTRATO_NOME,
        numeroContrato: "EDDY-001",
        fornecedor: "Eddydata S/A",
        objeto: "Solução de Gestão de Contratos",
        vigenciaInicio: agora,
        vigenciaFim: fim,
        valorAnual: 0,
        status: StatusContrato.ATIVO,
      },
    });
    console.log("[seed-eddydata] Contrato criado:", contrato.nome, contrato.id);
  } else {
    console.log("[seed-eddydata] Contrato existente:", contrato.nome, contrato.id);
  }

  let modulo = await prisma.modulo.findFirst({
    where: {
      contratoId: contrato.id,
      nome: { equals: MODULO_NOME, mode: "insensitive" },
    },
  });

  if (!modulo) {
    modulo = await prisma.modulo.create({
      data: {
        contratoId: contrato.id,
        nome: MODULO_NOME,
        ativo: true,
      },
    });
    console.log("[seed-eddydata] Módulo criado:", modulo.nome, modulo.id);
  } else {
    console.log("[seed-eddydata] Módulo existente:", modulo.nome, modulo.id);
  }

  let criados = 0;
  let atualizados = 0;

  for (let i = 0; i < itens.length; i++) {
    const row = itens[i];
    const numeroItem = i + 1;
    const descricao =
      typeof row.descricao === "string"
        ? (row.numero ? `${row.numero} - ${row.descricao}` : row.descricao).trim()
        : String(row.descricao || "").trim();
    const observacao =
      typeof row.categoria === "string" && row.categoria.trim()
        ? `Categoria: ${row.categoria.trim()}`
        : null;

    if (!descricao) continue;

    const existing = await prisma.itemContratual.findUnique({
      where: {
        contratoId_moduloId_numeroItem: {
          contratoId: contrato.id,
          moduloId: modulo.id,
          numeroItem,
        },
      },
    });

    const payload = {
      descricao,
      observacaoAtual: observacao,
      statusAtual: StatusItem.INCONCLUSIVO,
      cabecalhoLogico: false,
      considerarNaMedicao: true,
    };

    if (existing) {
      await prisma.itemContratual.update({
        where: { id: existing.id },
        data: payload,
      });
      atualizados++;
    } else {
      await prisma.itemContratual.create({
        data: {
          contratoId: contrato.id,
          moduloId: modulo.id,
          numeroItem,
          descricao: payload.descricao,
          observacaoAtual: payload.observacaoAtual,
          statusAtual: payload.statusAtual,
          cabecalhoLogico: payload.cabecalhoLogico,
          considerarNaMedicao: payload.considerarNaMedicao,
        },
      });
      criados++;
    }
  }

  const totalValidos = await prisma.itemContratual.count({
    where: {
      contratoId: contrato.id,
      considerarNaMedicao: true,
      cabecalhoLogico: false,
    },
  });

  const peso = totalValidos > 0 ? Number((100 / totalValidos).toFixed(6)) : 0;
  if (peso > 0) {
    await prisma.itemContratual.updateMany({
      where: { contratoId: contrato.id, considerarNaMedicao: true, cabecalhoLogico: false },
      data: { pesoPercentual: peso },
    });
  }

  await prisma.contrato.update({
    where: { id: contrato.id },
    data: { totalItensVerificacao: totalValidos },
  });

  console.log(
    "[seed-eddydata] Concluído. Itens criados:",
    criados,
    "| atualizados:",
    atualizados,
    "| total itens:",
    itens.length
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed-eddydata] Erro:", e);
  process.exit(1);
});
