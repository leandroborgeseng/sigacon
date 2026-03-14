/**
 * Importa itens de uma planilha XLSX para o contrato Eddydata.
 * Formato esperado: coluna A = número do item, coluna B = descrição; coluna C = observação (opcional).
 * Primeira linha pode ser cabeçalho (será ignorada).
 *
 * Uso:
 *   DATABASE_URL="..." node scripts/importar-eddydata-xlsx.js
 *   DATABASE_URL="..." node scripts/importar-eddydata-xlsx.js /caminho/para/planilha.xlsx
 *
 * Se não passar o caminho, usa scripts/planilha-eddydata.xlsx
 */
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { PrismaClient, StatusItem, StatusContrato } = require("@prisma/client");

const CONTRATO_NOME = "Eddydata";
const MODULO_NOME = "Requisitos do Projeto";
const DEFAULT_FILE = "planilha-eddydata.xlsx";
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
        `[importar-xlsx] Tentativa ${i + 1}/${MAX_RETRIES} de conexão:`,
        e.message
      );
      if (i < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS);
    }
  }
  return false;
}

function isHeaderRow(row) {
  if (!row || !Array.isArray(row)) return false;
  const a = String(row[0] ?? "").trim().toLowerCase();
  const b = String(row[1] ?? "").trim().toLowerCase();
  const looksLikeHeader =
    /^(item|número|numero|nº|#|descrição|descricao|description)$/.test(a) ||
    /^(descrição|descricao|description|desc)$/.test(b) ||
    (a === "" && b === "");
  return looksLikeHeader;
}

function loadRowsFromXLSX(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Planilha vazia.");
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) throw new Error("Planilha sem dados.");

  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;
  const dataRows = [];
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const num = row[0];
    const desc = String(row[1] ?? "").trim();
    const obs = row[2] != null && String(row[2]).trim() !== "" ? String(row[2]).trim() : null;
    if (!desc) continue;
    let numeroItem = i - startIndex + 1;
    if (num !== undefined && num !== null && num !== "") {
      const parsed = typeof num === "number" ? num : parseFloat(String(num).replace(",", "."));
      if (!Number.isNaN(parsed) && parsed >= 1) numeroItem = Math.floor(parsed);
    }
    dataRows.push({ numeroItem, descricao: desc, observacao: obs });
  }
  return dataRows;
}

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, DEFAULT_FILE);

  console.log("[importar-xlsx] Lendo:", filePath);

  const itens = loadRowsFromXLSX(filePath);
  console.log("[importar-xlsx] Linhas com descrição:", itens.length);

  if (itens.length === 0) {
    console.log("[importar-xlsx] Nenhum item para importar.");
    process.exit(0);
  }

  const connected = await connectWithRetry();
  if (!connected) {
    console.error("[importar-xlsx] Não foi possível conectar ao banco.");
    process.exit(1);
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
    console.log("[importar-xlsx] Contrato criado:", contrato.nome);
  } else {
    console.log("[importar-xlsx] Contrato existente:", contrato.nome);
  }

  let modulo = await prisma.modulo.findFirst({
    where: {
      contratoId: contrato.id,
      nome: { equals: MODULO_NOME, mode: "insensitive" },
    },
  });

  if (!modulo) {
    modulo = await prisma.modulo.create({
      data: { contratoId: contrato.id, nome: MODULO_NOME, ativo: true },
    });
    console.log("[importar-xlsx] Módulo criado:", modulo.nome);
  } else {
    console.log("[importar-xlsx] Módulo existente:", modulo.nome);
  }

  let criados = 0;
  let atualizados = 0;

  for (let i = 0; i < itens.length; i++) {
    const { numeroItem, descricao, observacao } = itens[i];
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

    if ((i + 1) % 100 === 0) {
      console.log("[importar-xlsx] Processados", i + 1, "/", itens.length);
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
      where: {
        contratoId: contrato.id,
        considerarNaMedicao: true,
        cabecalhoLogico: false,
      },
      data: { pesoPercentual: peso },
    });
  }

  await prisma.contrato.update({
    where: { id: contrato.id },
    data: { totalItensVerificacao: totalValidos },
  });

  console.log(
    "[importar-xlsx] Concluído. Criados:",
    criados,
    "| Atualizados:",
    atualizados,
    "| Total:",
    itens.length
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[importar-xlsx] Erro:", e);
  process.exit(1);
});
