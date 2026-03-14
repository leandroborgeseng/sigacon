import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { StatusItem, OrigemAvaliacao } from "@prisma/client";
import { registerAudit } from "@/server/services/audit";
import { calcularPesoPercentualPorItem } from "@/lib/finance";

const MAP_STATUS: Record<string, StatusItem> = {
  ATENDE: StatusItem.ATENDE,
  NAO_ATENDE: StatusItem.NAO_ATENDE,
  PARCIAL: StatusItem.PARCIAL,
  INCONCLUSIVO: StatusItem.INCONCLUSIVO,
  DESCONSIDERADO: StatusItem.DESCONSIDERADO,
  "NÃO SE APLICA": StatusItem.NAO_SE_APLICA,
  NAO_SE_APLICA: StatusItem.NAO_SE_APLICA,
  CABECALHO: StatusItem.CABECALHO,
  SIM: StatusItem.ATENDE,
  NÃO: StatusItem.NAO_ATENDE,
  "NÃO": StatusItem.NAO_ATENDE,
  "SIM": StatusItem.ATENDE,
};

function parseStatus(val: unknown): StatusItem | null {
  if (val == null || val === "") return null;
  const s = String(val).toUpperCase().trim();
  return MAP_STATUS[s] ?? null;
}

export interface ImportResult {
  itensCriados: number;
  itensAtualizados: number;
  avaliacoesCriadas: number;
  linhasIgnoradas: number;
  erros: string[];
}

export async function importarPlanilhaXLSX(
  buffer: Buffer,
  contratoId: string,
  usuarioId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    itensCriados: 0,
    itensAtualizados: 0,
    avaliacoesCriadas: 0,
    linhasIgnoradas: 0,
    erros: [],
  };

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    result.erros.push("Planilha vazia");
    return result;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) {
    result.erros.push("Planilha sem dados (apenas cabeçalho ou vazia)");
    return result;
  }

  const header = rows[0] as string[];
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = String(h ?? "").trim().toLowerCase();
    colIndex[key] = i;
  });

  const getModulo = (nome: string) => {
    const n = String(nome || "").trim();
    if (!n) return null;
    return n;
  };

  const modulosCriados = new Map<string, string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const colMod = colIndex["módulo"] ?? colIndex["modulo"] ?? -1;
    const moduloNome = getModulo(colMod >= 0 ? String(row[colMod] ?? "") : "");
    const colLote = colIndex["lote"] ?? -1;
    const lote = (colLote >= 0 ? String(row[colLote] ?? "") : "").trim() || "";
    const colItem = colIndex["item"] ?? colIndex["numeroitem"] ?? -1;
    const numeroItemRaw = colItem >= 0 ? row[colItem] : undefined;
    const numeroItem = numeroItemRaw !== undefined && numeroItemRaw !== "" ? Number(numeroItemRaw) : i;
    const colDesc = colIndex["descrição"] ?? colIndex["descricao"] ?? -1;
    const descricao = (colDesc >= 0 ? String(row[colDesc] ?? "") : "").trim();

    if (!moduloNome || !descricao) {
      result.linhasIgnoradas++;
      continue;
    }

    if (isNaN(numeroItem) || numeroItem < 1) {
      result.linhasIgnoradas++;
      continue;
    }

    let moduloId = modulosCriados.get(moduloNome);
    if (!moduloId) {
      const existente = await prisma.modulo.findUnique({
        where: {
          contratoId_nome: { contratoId, nome: moduloNome },
        },
      });
      if (existente) {
        moduloId = existente.id;
      } else {
        const novo = await prisma.modulo.create({
          data: { contratoId, nome: moduloNome, ativo: true },
        });
        moduloId = novo.id;
      }
      modulosCriados.set(moduloNome, moduloId);
    }

    let statusAtual: StatusItem = StatusItem.INCONCLUSIVO;
    const colAtende = colIndex["atende?"] ?? colIndex["atende"] ?? -1;
    let valorAtende = colAtende >= 0 ? row[colAtende] : null;

    for (let c = header.length - 1; c >= 0; c--) {
      const colName = String(header[c] ?? "").trim();
      const val = row[c];
      const st = parseStatus(val);
      if (st && colName.toLowerCase().includes("consolidado")) {
        statusAtual = st;
        break;
      }
    }
    if (valorAtende != null && valorAtende !== "") {
      const st = parseStatus(valorAtende);
      if (st) statusAtual = st;
    }

    const colObs = colIndex["observação"] ?? colIndex["observacao"] ?? -1;
    const observacao = (colObs >= 0 ? String(row[colObs] ?? "") : "").trim();

    const colCab = colIndex["cabeçalho"] ?? colIndex["cabecalho"] ?? -1;
    const cabecalhoLogico =
      (colCab >= 0 ? String(row[colCab] ?? "") : "")
        .trim()
        .toLowerCase() === "sim" ||
      statusAtual === StatusItem.CABECALHO;

    const existing = await prisma.itemContratual.findUnique({
      where: {
        contratoId_moduloId_numeroItem: {
          contratoId,
          moduloId,
          numeroItem,
        },
      },
    });

    const itemData = {
      contratoId,
      moduloId,
      lote,
      numeroItem,
      descricao,
      statusAtual,
      observacaoAtual: observacao || null,
      cabecalhoLogico,
      considerarNaMedicao: !cabecalhoLogico && statusAtual !== StatusItem.CABECALHO,
    };

    if (existing) {
      await prisma.itemContratual.update({
        where: { id: existing.id },
        data: {
          descricao: itemData.descricao,
          statusAtual: itemData.statusAtual,
          observacaoAtual: itemData.observacaoAtual,
          cabecalhoLogico: itemData.cabecalhoLogico,
          considerarNaMedicao: itemData.considerarNaMedicao,
        },
      });
      result.itensAtualizados++;
    } else {
      await prisma.itemContratual.create({
        data: {
          ...itemData,
          lote: itemData.lote || "",
        },
      });
      result.itensCriados++;
    }

    const item = await prisma.itemContratual.findUnique({
      where: {
        contratoId_moduloId_numeroItem: {
          contratoId,
          moduloId,
          numeroItem,
        },
      },
    });

    if (item) {
      const now = new Date();
      await prisma.avaliacaoItem.create({
        data: {
          itemId: item.id,
          dataAvaliacao: now,
          competenciaAno: now.getFullYear(),
          competenciaMes: now.getMonth() + 1,
          status: statusAtual,
          observacao: observacao || null,
          usuarioId,
          origem: OrigemAvaliacao.IMPORTACAO,
        },
      });
      result.avaliacoesCriadas++;
    }
  }

  const totalValidos = await prisma.itemContratual.count({
    where: {
      contratoId,
      considerarNaMedicao: true,
      cabecalhoLogico: false,
    },
  });
  const peso = calcularPesoPercentualPorItem(totalValidos);
  if (peso > 0) {
    await prisma.itemContratual.updateMany({
      where: { contratoId, considerarNaMedicao: true, cabecalhoLogico: false },
      data: { pesoPercentual: peso },
    });
  }

  await prisma.contrato.update({
    where: { id: contratoId },
    data: { totalItensVerificacao: totalValidos },
  });

  await registerAudit({
    entidade: "Importacao",
    entidadeId: contratoId,
    acao: "IMPORTACAO_XLSX",
    valorNovo: result,
    usuarioId,
  });

  return result;
}
