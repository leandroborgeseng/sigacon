import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { LeiLicitacao, StatusContrato } from "@prisma/client";
import { calcularValorMensalReferencia } from "@/lib/finance";
import { registerAudit } from "@/server/services/audit";

export interface ImportContratosResult {
  contratosCriados: number;
  contratosAtualizados: number;
  linhasIgnoradas: number;
  linhasLidas: number;
  erros: string[];
}

type RowObj = Record<string, unknown>;

function normHeader(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseBool(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["1", "sim", "s", "true", "ativo"].includes(s)) return true;
  if (["0", "nao", "não", "n", "false", "inativo"].includes(s)) return false;
  return null;
}

function parseLei(v: unknown): LeiLicitacao | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (s.includes("14133") || s.includes("14.133")) return LeiLicitacao.LEI_14133;
  if (s.includes("8666") || s.includes("8.666")) return LeiLicitacao.LEI_8666;
  if (s === "lei_14133") return LeiLicitacao.LEI_14133;
  if (s === "lei_8666") return LeiLicitacao.LEI_8666;
  return null;
}

function parseStatus(v: unknown): StatusContrato | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().toUpperCase();
  const map: Record<string, StatusContrato> = {
    ATIVO: StatusContrato.ATIVO,
    ENCERRADO: StatusContrato.ENCERRADO,
    SUSPENSO: StatusContrato.SUSPENSO,
    EM_IMPLANTACAO: StatusContrato.EM_IMPLANTACAO,
    EM_AVALIACAO: StatusContrato.EM_AVALIACAO,
  };
  return map[s] ?? null;
}

function parseNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function gerarTemplateContratosXLSX(): Buffer {
  const header = [
    "numero_contrato*",
    "nome*",
    "fornecedor*",
    "objeto",
    "vigencia_inicio* (YYYY-MM-DD)",
    "vigencia_fim* (YYYY-MM-DD)",
    "valor_anual*",
    "status (ATIVO/ENCERRADO/SUSPENSO/EM_IMPLANTACAO/EM_AVALIACAO)",
    "gestor_contrato",
    "observacoes_gerais",
    "lei_licitacao (LEI_8666/LEI_14133 ou 8.666/14.133)",
    "data_assinatura (YYYY-MM-DD)",
    "numero_renovacoes",
    "ativo (sim/nao)",
  ];

  const example = [
    "001/2026",
    "Serviços de limpeza",
    "Empresa ABC Ltda",
    "Limpeza predial",
    "2026-01-01",
    "2026-12-31",
    "120000.00",
    "ATIVO",
    "Fulano de Tal",
    "",
    "LEI_14133",
    "2026-01-01",
    "0",
    "sim",
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CONTRATOS");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out;
}

export async function importarContratosXLSX(buffer: Buffer, usuarioId: string): Promise<ImportContratosResult> {
  const result: ImportContratosResult = {
    contratosCriados: 0,
    contratosAtualizados: 0,
    linhasIgnoradas: 0,
    linhasLidas: 0,
    erros: [],
  };

  const wb = XLSX.read(buffer, { type: "buffer", cellStyles: false });
  const sheet = wb.Sheets["CONTRATOS"] ?? wb.Sheets[wb.SheetNames?.[0] ?? ""];
  if (!sheet) {
    result.erros.push("Planilha vazia. Esperado aba 'CONTRATOS'.");
    return result;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
  if (!rows.length || rows.length < 2) {
    result.erros.push("Planilha sem dados (apenas cabeçalho ou vazia).");
    return result;
  }

  const header = (rows[0] as unknown[]).map(normHeader);
  const dataRows = rows.slice(1);
  result.linhasLidas = dataRows.length;

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(normHeader(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const cNumero = idx(["numero_contrato", "numero contrato", "número do contrato", "n contrato"]);
  const cNome = idx(["nome"]);
  const cFornecedor = idx(["fornecedor"]);
  const cObjeto = idx(["objeto"]);
  const cInicio = idx(["vigencia_inicio", "vigencia inicio", "vigência início", "inicio", "data inicio"]);
  const cFim = idx(["vigencia_fim", "vigencia fim", "vigência fim", "fim", "data fim"]);
  const cValor = idx(["valor_anual", "valor anual"]);
  const cStatus = idx(["status"]);
  const cGestor = idx(["gestor_contrato", "gestor contrato", "gestor"]);
  const cObs = idx(["observacoes_gerais", "observacoes gerais", "observações gerais", "observacoes"]);
  const cLei = idx(["lei_licitacao", "lei licitacao", "lei"]);
  const cAss = idx(["data_assinatura", "data assinatura", "assinatura"]);
  const cRen = idx(["numero_renovacoes", "numero renovacoes", "renovacoes"]);
  const cAtivo = idx(["ativo"]);

  const requiredMissing: string[] = [];
  if (cNumero < 0) requiredMissing.push("numero_contrato");
  if (cNome < 0) requiredMissing.push("nome");
  if (cFornecedor < 0) requiredMissing.push("fornecedor");
  if (cInicio < 0) requiredMissing.push("vigencia_inicio");
  if (cFim < 0) requiredMissing.push("vigencia_fim");
  if (cValor < 0) requiredMissing.push("valor_anual");
  if (requiredMissing.length) {
    result.erros.push(`Colunas obrigatórias ausentes: ${requiredMissing.join(", ")}`);
    return result;
  }

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r] as unknown[];
    const linha = r + 2;

    const numeroContrato = String(row[cNumero] ?? "").trim();
    const nome = String(row[cNome] ?? "").trim();
    const fornecedor = String(row[cFornecedor] ?? "").trim();
    const vigenciaInicio = parseDate(row[cInicio]);
    const vigenciaFim = parseDate(row[cFim]);
    const valorAnual = parseNumber(row[cValor]);

    if (!numeroContrato || !nome || !fornecedor || !vigenciaInicio || !vigenciaFim || valorAnual == null) {
      result.linhasIgnoradas++;
      result.erros.push(`Linha ${linha}: campos obrigatórios inválidos ou vazios.`);
      continue;
    }

    const data: RowObj = {
      numeroContrato,
      nome,
      fornecedor,
      objeto: cObjeto >= 0 && String(row[cObjeto] ?? "").trim() ? String(row[cObjeto]).trim() : null,
      vigenciaInicio,
      vigenciaFim,
      valorAnual,
      valorMensalReferencia: calcularValorMensalReferencia(valorAnual),
      status: parseStatus(cStatus >= 0 ? row[cStatus] : null) ?? StatusContrato.ATIVO,
      gestorContrato: cGestor >= 0 && String(row[cGestor] ?? "").trim() ? String(row[cGestor]).trim() : null,
      observacoesGerais: cObs >= 0 && String(row[cObs] ?? "").trim() ? String(row[cObs]).trim() : null,
      leiLicitacao: parseLei(cLei >= 0 ? row[cLei] : null) ?? LeiLicitacao.LEI_8666,
      dataAssinatura: parseDate(cAss >= 0 ? row[cAss] : null),
      numeroRenovacoes: (() => {
        const n = parseNumber(cRen >= 0 ? row[cRen] : null);
        return n == null ? 0 : Math.max(0, Math.floor(n));
      })(),
      ativo: parseBool(cAtivo >= 0 ? row[cAtivo] : null) ?? true,
      formaCalculoMedicao: "PESO_IGUAL_POR_ITEM",
    };

    const existing = await prisma.contrato.findFirst({
      where: { numeroContrato },
    });

    if (!existing) {
      const created = await prisma.contrato.create({ data: data as never });
      result.contratosCriados++;
      await registerAudit({
        entidade: "Contrato",
        entidadeId: created.id,
        acao: "IMPORTACAO_CONTRATO_CRIACAO",
        valorNovo: created,
        usuarioId,
      });
    } else {
      const updated = await prisma.contrato.update({
        where: { id: existing.id },
        data: data as never,
      });
      result.contratosAtualizados++;
      await registerAudit({
        entidade: "Contrato",
        entidadeId: existing.id,
        acao: "IMPORTACAO_CONTRATO_ATUALIZACAO",
        valorAnterior: existing,
        valorNovo: updated,
        usuarioId,
      });
    }
  }

  return result;
}

