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
  linhasLidas: number;
  abasProcessadas: number;
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
    linhasLidas: 0,
    abasProcessadas: 0,
    erros: [],
  };

  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: false });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    result.erros.push("Planilha vazia");
    return result;
  }

  let header: string[] = [];
  const allDataRows: unknown[][] = [];

  function getSheetRows(sheet: XLSX.WorkSheet): unknown[][] {
    const keys = Object.keys(sheet).filter((k) => /^[A-Z]+\d+$/.test(k));
    const ref = (sheet as { "!ref"?: string })["!ref"];
    if (ref && keys.length > 0) {
      const maxRowFromCells = Math.max(
        ...keys.map((k) => parseInt(k.replace(/^[A-Z]+/, ""), 10))
      );
      const range = XLSX.utils.decode_range(ref);
      if (maxRowFromCells > range.e.r + 1 && maxRowFromCells <= 50000) {
        range.e.r = maxRowFromCells - 1;
        (sheet as { "!ref"?: string })["!ref"] = XLSX.utils.encode_range(range);
      }
    }
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
  }

  for (let s = 0; s < sheetNames.length; s++) {
    const sheet = workbook.Sheets[sheetNames[s]];
    if (!sheet) continue;
    const sheetRows = getSheetRows(sheet);
    if (sheetRows.length === 0) continue;
    if (s === 0) {
      header = (sheetRows[0] as string[]).map((h) => String(h ?? "").trim());
      for (let r = 1; r < sheetRows.length; r++) {
        allDataRows.push(sheetRows[r] as unknown[]);
      }
    } else {
      const firstRow = (sheetRows[0] as unknown[]).map((c) => String(c ?? "").trim());
      const looksLikeHeader = firstRow.some((c) => c.length > 0 && c.length < 50 && !/^\d+$/.test(c));
      const start = looksLikeHeader ? 1 : 0;
      for (let r = start; r < sheetRows.length; r++) {
        allDataRows.push(sheetRows[r] as unknown[]);
      }
    }
  }

  result.linhasLidas = allDataRows.length;
  result.abasProcessadas = sheetNames.length;

  const rows = [header, ...allDataRows];

  if (rows.length < 2) {
    result.erros.push("Planilha sem dados (apenas cabeçalho ou vazia)");
    return result;
  }
  const colIndex: Record<string, number> = {};
  const headerNorm: { n: string; i: number }[] = [];
  header.forEach((h, i) => {
    const key = String(h ?? "").trim().toLowerCase();
    colIndex[key] = i;
    const n = key
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ");
    headerNorm.push({ n, i });
  });

  function findCol(exactKeys: string[], ...substrings: string[]): number {
    for (const k of exactKeys) {
      if (colIndex[k] !== undefined) return colIndex[k];
    }
    for (const sub of substrings) {
      const s = sub.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      for (const { n, i } of headerNorm) {
        if (n.includes(s) || s.includes(n)) return i;
      }
    }
    return -1;
  }

  let colId = findCol(["id"], "id");
  let colItem = findCol(["item", "numeroitem", "numero item"], "item", "numero");
  let colDesc = findCol(["descrição", "descricao", "description"], "descricao", "descrição", "description");
  const colMod = findCol(["módulo", "modulo"], "modulo", "módulo");
  const colLote = colIndex["lote"] ?? findCol(["lote"], "lote");
  let colObs = findCol(["observação", "observacao", "observation"], "observacao", "observação", "observation");
  const colConforme = findCol(
    ["conforme contrato eddydata", "conforme contrato eddy data", "conforme eddydata"],
    "conforme",
    "eddydata"
  );
  const colRequisito = colIndex["requisito"] ?? findCol(["requisito"], "requisito");
  const colAtende = findCol(["atende?", "atende"], "atende");
  const colCab = findCol(["cabeçalho", "cabecalho"], "cabeçalho");

  if (colDesc < 0 && header.length >= 3) {
    colDesc = 2;
    if (colItem < 0) colItem = 1;
    if (colId < 0) colId = 0;
    if (colObs < 0 && header.length > 12) colObs = 12;
  }

  const DEFAULT_MODULO = "Requisitos do Projeto";

  const getVal = (row: unknown[], col: number) =>
    col >= 0 && row[col] != null ? String(row[col]).trim() : "";
  const isEmpty = (s: string) => s === "";

  type LogicalRow = {
    moduloNome: string;
    lote: string;
    numeroItem: number;
    descricao: string;
    observacao: string | null;
    status: StatusItem;
    cabecalhoLogico: boolean;
  };

  const logicalRows: LogicalRow[] = [];
  let current: LogicalRow | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const idVal = getVal(row, colId);
    const itemVal = getVal(row, colItem);
    const descVal = getVal(row, colDesc);
    const modVal = getVal(row, colMod);
    const loteVal = colLote >= 0 ? getVal(row, colLote) : "";
    const obsVal = getVal(row, colObs);
    const conformeVal = getVal(row, colConforme).toLowerCase();
    const requisitoVal = getVal(row, colRequisito).toLowerCase();
    const atendeVal = colAtende >= 0 ? row[colAtende] : null;
    const cabVal = getVal(row, colCab).toLowerCase() === "sim";

    if (!descVal) {
      result.linhasIgnoradas++;
      continue;
    }

    let numeroItem: number;
    if (itemVal && !Number.isNaN(Number(itemVal))) {
      numeroItem = Math.floor(Number(itemVal));
    } else if (idVal && !Number.isNaN(parseInt(idVal.replace(/\D/g, ""), 10))) {
      numeroItem = parseInt(idVal.replace(/\D/g, ""), 10);
    } else {
      numeroItem = logicalRows.length + 1;
    }
    if (numeroItem < 1) {
      result.linhasIgnoradas++;
      continue;
    }

    let statusAtual: StatusItem = StatusItem.INCONCLUSIVO;
    if (atendeVal != null && atendeVal !== "") {
      const st = parseStatus(atendeVal);
      if (st) statusAtual = st;
    } else if (conformeVal === "sim" || requisitoVal === "sim") {
      statusAtual = StatusItem.ATENDE;
    }
    for (let c = header.length - 1; c >= 0; c--) {
      const colName = String(header[c] ?? "").trim().toLowerCase();
      const val = row[c];
      const st = parseStatus(val);
      if (st && colName.includes("consolidado")) {
        statusAtual = st;
        break;
      }
    }

    const moduloNome = modVal || DEFAULT_MODULO;
    current = {
      moduloNome,
      lote: loteVal,
      numeroItem,
      descricao: descVal,
      observacao: obsVal || null,
      status: statusAtual,
      cabecalhoLogico: cabVal || statusAtual === StatusItem.CABECALHO,
    };
    logicalRows.push(current);
  }

  if (logicalRows.length === 0 && rows.length > 1) {
    result.erros.push(
      "Nenhuma linha com descrição encontrada. Use colunas ID ou Item, Descrição (coluna com texto). Cabeçalho na primeira linha."
    );
  }

  const getModulo = (nome: string) => {
    const n = String(nome || "").trim();
    return n || null;
  };
  const modulosCriados = new Map<string, string>();

  for (const logical of logicalRows) {
    const { moduloNome, lote, numeroItem, descricao, observacao, status: statusAtual, cabecalhoLogico } = logical;
    const modNome = getModulo(moduloNome) || DEFAULT_MODULO;

    let moduloId = modulosCriados.get(modNome);
    if (!moduloId) {
      const existente = await prisma.modulo.findUnique({
        where: { contratoId_nome: { contratoId, nome: modNome } },
      });
      if (existente) {
        moduloId = existente.id;
      } else {
        const novo = await prisma.modulo.create({
          data: { contratoId, nome: modNome, ativo: true },
        });
        moduloId = novo.id;
      }
      modulosCriados.set(modNome, moduloId);
    }

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
      lote: lote || "",
      numeroItem,
      descricao,
      statusAtual,
      observacaoAtual: observacao,
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
        data: itemData,
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
          observacao,
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
