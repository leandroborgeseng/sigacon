import { prisma } from "@/lib/prisma";
import { GlpiKanbanColuna } from "@prisma/client";
import {
  glpiSearchTicketIds,
  glpiGetTicket,
  glpiWithSession,
  type GlpiCriterion,
} from "@/lib/glpi-client";
import { getGlpiCredentialsResolved } from "@/lib/glpi-config";
import { colunaParaStatusGlpi, statusGlpiParaColuna } from "@/lib/glpi-kanban-map";

function stripHtml(s: string, max = 500): string {
  const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function statusLabelGlpi(status: number): string {
  switch (status) {
    case 1:
      return "Novo";
    case 2:
      return "Em processamento (atribuído)";
    case 3:
      return "Em processamento (planejado)";
    case 4:
      return "Pendente";
    case 5:
      return "Resolvido";
    case 6:
      return "Fechado";
    default:
      return `Status ${status}`;
  }
}

async function parseExtraCriteria(): Promise<GlpiCriterion[]> {
  const row = await prisma.glpiConfig.findUnique({ where: { id: "default" } });
  const raw = row?.criteriosExtraJson?.trim() || process.env.GLPI_SYNC_CRITERIA_EXTRA?.trim();
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GlpiCriterion[];
  } catch {
    return [];
  }
}

async function buscarIdsTicketsComPaginacao(
  ctx: Parameters<typeof glpiSearchTicketIds>[0],
  criteria: GlpiCriterion[],
  opts?: { pageSize?: number; maxPages?: number }
): Promise<number[]> {
  const pageSize = Math.max(50, opts?.pageSize ?? 200);
  const maxPages = Math.max(1, opts?.maxPages ?? 20);
  const ids = new Set<number>();
  for (let page = 0; page < maxPages; page++) {
    const ini = page * pageSize;
    const fim = ini + pageSize - 1;
    const lote = await glpiSearchTicketIds(ctx, criteria, `${ini}-${fim}`);
    for (const id of lote) ids.add(id);
    if (lote.length < pageSize) break;
  }
  return [...ids];
}

export type SincronizarParams = {
  /** Filtro preferencial: grupos técnicos vinculados ao contrato (campo de busca configurável). */
  contratoId?: string;
  /** Alternativa: termo livre no título (quando não há grupos no contrato). */
  termoTitulo?: string;
  /** Incremental: processa apenas tickets alterados após este instante. */
  alteradosApos?: Date;
  /** Quando true, atualiza somente tickets abertos (cache local). */
  somenteAbertosLocais?: boolean;
};

type SyncResumo = { processados: number; erros: string[] };
type SyncAutoResumo = SyncResumo & {
  contratosProcessados: number;
  retriesExecutados: number;
  lockAdquirido: boolean;
  startedAt: string;
  finishedAt: string;
};

const GLPI_SYNC_LOCK_KEY = 90251001;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateToGlpiSearchValue(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

async function acquirePgAdvisoryLock(lockKey: number): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
      `SELECT pg_try_advisory_lock(${lockKey}) AS locked`
    );
    return Boolean(rows?.[0]?.locked);
  } catch {
    return true;
  }
}

async function releasePgAdvisoryLock(lockKey: number): Promise<void> {
  try {
    await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${lockKey})`);
  } catch {
    // Sem suporte a advisory lock no banco atual; ignora.
  }
}

/**
 * Busca tickets no GLPI e faz upsert local.
 * Com grupos vinculados ao contrato: busca por grupo técnico atribuído (OR entre grupos).
 * Com contrato sem grupos: não sincroniza tickets.
 * Sem contrato e sem termo: busca ampla (sem critérios), útil para bootstrap do Kanban.
 */
export async function sincronizarChamadosGlpi(params: SincronizarParams): Promise<SyncResumo> {
  const erros: string[] = [];
  const cred = await getGlpiCredentialsResolved();
  if (!cred) {
    return { processados: 0, erros: ["GLPI não configurado (use Configuração GLPI ou variáveis de ambiente)"] };
  }
  const campoGrupo = cred.campoBuscaGrupoTecnico;
  const campoDataModificacao = cred.campoDataModificacao;

  let contratoId = params.contratoId;
  let fornecedorNome: string | null = null;
  let termoLivre = params.termoTitulo?.trim();
  let gruposIds: { glpiGroupId: number }[] = [];

  if (params.somenteAbertosLocais) {
    let processadosAbertos = 0;
    try {
      await glpiWithSession(async (ctx) => {
        const abertos = await prisma.glpiChamado.findMany({
          where: { statusGlpi: { in: [1, 2, 3, 4] } },
          orderBy: [{ dataModificacao: "desc" }, { glpiTicketId: "desc" }],
          select: { glpiTicketId: true, contratoId: true, fornecedorNome: true },
          take: 300,
        });
        for (const row of abertos) {
          try {
            const t = await glpiGetTicket(ctx, row.glpiTicketId);
            const status = typeof t.status === "number" ? t.status : Number(t.status);
            if (Number.isNaN(status)) continue;
            const coluna = statusGlpiParaColuna(status);
            const titulo = (t.name ?? `#${row.glpiTicketId}`).trim() || `#${row.glpiTicketId}`;
            const preview = t.content ? stripHtml(String(t.content)) : null;
            const categoriaIdGlpi = asInt(t.itilcategories_id);
            const categoriaNome = asText(t._itilcategories_id);
            const grupoTecnicoIdGlpi = asInt(t.groups_id_assign);
            const grupoTecnicoNome = asText(t._groups_id_assign);
            const tecnicoResponsavelIdGlpi = asInt(t.users_id_assign);
            const tecnicoResponsavelNome = asText(t._users_id_assign);
            const agora = new Date();
            await prisma.glpiChamado.update({
              where: { glpiTicketId: row.glpiTicketId },
              data: {
                titulo,
                conteudoPreview: preview,
                urgencia: t.urgency ?? null,
                prioridade: t.priority ?? null,
                categoriaIdGlpi,
                categoriaNome,
                grupoTecnicoIdGlpi,
                grupoTecnicoNome,
                tecnicoResponsavelIdGlpi,
                tecnicoResponsavelNome,
                statusGlpi: status,
                statusLabel: statusLabelGlpi(status),
                colunaKanban: coluna,
                dataAbertura: t.date ? new Date(t.date) : null,
                dataModificacao: t.date_mod ? new Date(t.date_mod) : null,
                fornecedorNome: row.fornecedorNome ?? undefined,
                contratoId: row.contratoId ?? undefined,
                sincronizadoEm: agora,
                ultimoPullEm: agora,
                syncStatus: "OK",
                syncErro: null,
              },
            });
            processadosAbertos++;
          } catch (e) {
            erros.push(`Ticket aberto ${row.glpiTicketId}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      });
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
    }
    return { processados: processadosAbertos, erros };
  }

  if (params.contratoId) {
    const c = await prisma.contrato.findUnique({
      where: { id: params.contratoId },
      select: {
        id: true,
        fornecedor: true,
        glpiGruposTecnicos: { select: { glpiGroupId: true } },
      },
    });
    if (!c) {
      return { processados: 0, erros: ["Contrato não encontrado"] };
    }
    fornecedorNome = c.fornecedor;
    contratoId = c.id;
    gruposIds = c.glpiGruposTecnicos;
    if (gruposIds.length === 0) {
      return {
        processados: 0,
        erros: ["Este contrato não possui grupos técnicos GLPI cadastrados para filtro."],
      };
    }
  }

  const extra = await parseExtraCriteria();
  let criteria: GlpiCriterion[] = [];

  if (contratoId && gruposIds.length > 0) {
    gruposIds.forEach((g, i) => {
      criteria.push({
        field: campoGrupo,
        searchtype: "equals",
        value: g.glpiGroupId,
        ...(i > 0 ? { link: "OR" as const } : {}),
      });
    });
    for (const ex of extra) {
      criteria.push({ ...ex, link: ex.link ?? "AND" });
    }
  } else if (termoLivre) {
    criteria = [{ field: 1, searchtype: "contains", value: termoLivre }];
    for (const ex of extra) {
      criteria.push({ ...ex, link: ex.link ?? "AND" });
    }
  } else {
    // Bootstrap: sem filtro explícito, consulta ampla.
    criteria = [];
    for (const ex of extra) {
      criteria.push({ ...ex, link: ex.link ?? "AND" });
    }
  }

  if (params.alteradosApos) {
    // Campo configurável em glpi_config para "date_mod" no search/Ticket.
    criteria.push({
      field: campoDataModificacao,
      searchtype: "morethan",
      value: dateToGlpiSearchValue(params.alteradosApos),
      link: "AND",
    });
  }

  let processados = 0;
  try {
    await glpiWithSession(async (ctx) => {
      const ids = await buscarIdsTicketsComPaginacao(ctx, criteria);
      for (const ticketId of ids) {
        try {
          const t = await glpiGetTicket(ctx, ticketId);
          const status = typeof t.status === "number" ? t.status : Number(t.status);
          if (Number.isNaN(status)) {
            erros.push(`Ticket ${ticketId}: status inválido`);
            continue;
          }
          const coluna = statusGlpiParaColuna(status);
          const titulo = (t.name ?? `#${ticketId}`).trim() || `#${ticketId}`;
          const preview = t.content ? stripHtml(String(t.content)) : null;
          const categoriaIdGlpi = asInt(t.itilcategories_id);
          const categoriaNome = asText(t._itilcategories_id);
          const grupoTecnicoIdGlpi = asInt(t.groups_id_assign);
          const grupoTecnicoNome = asText(t._groups_id_assign);
          const tecnicoResponsavelIdGlpi = asInt(t.users_id_assign);
          const tecnicoResponsavelNome = asText(t._users_id_assign);
          const agora = new Date();

          await prisma.glpiChamado.upsert({
            where: { glpiTicketId: ticketId },
            create: {
              glpiTicketId: ticketId,
              contratoId: contratoId ?? null,
              fornecedorNome,
              titulo,
              conteudoPreview: preview,
              urgencia: t.urgency ?? null,
              prioridade: t.priority ?? null,
              categoriaIdGlpi,
              categoriaNome,
              grupoTecnicoIdGlpi,
              grupoTecnicoNome,
              tecnicoResponsavelIdGlpi,
              tecnicoResponsavelNome,
              statusGlpi: status,
              statusLabel: statusLabelGlpi(status),
              colunaKanban: coluna,
              dataAbertura: t.date ? new Date(t.date) : null,
              dataModificacao: t.date_mod ? new Date(t.date_mod) : null,
              sincronizadoEm: agora,
              ultimoPullEm: agora,
              syncStatus: "OK",
              syncErro: null,
            },
            update: {
              titulo,
              conteudoPreview: preview,
              urgencia: t.urgency ?? null,
              prioridade: t.priority ?? null,
              categoriaIdGlpi,
              categoriaNome,
              grupoTecnicoIdGlpi,
              grupoTecnicoNome,
              tecnicoResponsavelIdGlpi,
              tecnicoResponsavelNome,
              statusGlpi: status,
              statusLabel: statusLabelGlpi(status),
              colunaKanban: coluna,
              dataAbertura: t.date ? new Date(t.date) : null,
              dataModificacao: t.date_mod ? new Date(t.date_mod) : null,
              fornecedorNome: fornecedorNome ?? undefined,
              contratoId: contratoId ?? undefined,
              sincronizadoEm: agora,
              ultimoPullEm: agora,
              syncStatus: "OK",
              syncErro: null,
            },
          });
          processados++;
        } catch (e) {
          erros.push(`Ticket ${ticketId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    });
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
  }

  return { processados, erros };
}

async function getGlobalWatermark(): Promise<Date | null> {
  const row = await prisma.glpiChamado.aggregate({
    _max: { dataModificacao: true, ultimoPullEm: true },
  });
  return row._max.dataModificacao ?? row._max.ultimoPullEm ?? null;
}

async function syncComRetry(params: SincronizarParams, maxRetries: number): Promise<SyncResumo & { retriesExecutados: number }> {
  let tentativa = 0;
  let retriesExecutados = 0;
  let ultimo: SyncResumo = { processados: 0, erros: [] };
  while (tentativa <= maxRetries) {
    ultimo = await sincronizarChamadosGlpi(params);
    if (ultimo.erros.length === 0) return { ...ultimo, retriesExecutados };
    if (tentativa === maxRetries) return { ...ultimo, retriesExecutados };
    retriesExecutados++;
    await esperar((tentativa + 1) * 1000);
    tentativa++;
  }
  return { ...ultimo, retriesExecutados };
}

export async function sincronizarChamadosGlpiAutomatico(input?: {
  contratoId?: string;
  maxRetries?: number;
  incremental?: boolean;
}): Promise<SyncAutoResumo> {
  const startedAt = new Date();
  const lockAdquirido = await acquirePgAdvisoryLock(GLPI_SYNC_LOCK_KEY);
  if (!lockAdquirido) {
    return {
      processados: 0,
      erros: ["Sincronização já está em execução em outra instância."],
      contratosProcessados: 0,
      retriesExecutados: 0,
      lockAdquirido: false,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  try {
    const maxRetries = Math.max(0, input?.maxRetries ?? Number(process.env.GLPI_SYNC_MAX_RETRIES ?? "2"));
    const incremental = input?.incremental ?? true;
    const alteradosApos = incremental ? await getGlobalWatermark() : null;
    const erros: string[] = [];
    let processados = 0;
    let contratosProcessados = 0;
    let retriesExecutados = 0;

    if (input?.contratoId) {
      const r = await syncComRetry({ contratoId: input.contratoId, alteradosApos: alteradosApos ?? undefined }, maxRetries);
      processados += r.processados;
      retriesExecutados += r.retriesExecutados;
      erros.push(...r.erros.map((e) => `[contrato ${input.contratoId}] ${e}`));
      contratosProcessados = 1;
    } else {
      const contratos = await prisma.contrato.findMany({
        where: { ativo: true },
        select: { id: true },
        orderBy: { nome: "asc" },
      });
      for (const c of contratos) {
        const r = await syncComRetry({ contratoId: c.id, alteradosApos: alteradosApos ?? undefined }, maxRetries);
        processados += r.processados;
        retriesExecutados += r.retriesExecutados;
        erros.push(...r.erros.map((e) => `[contrato ${c.id}] ${e}`));
        contratosProcessados++;
      }
      if (incremental) {
        const abertos = await syncComRetry({ somenteAbertosLocais: true }, maxRetries);
        processados += abertos.processados;
        retriesExecutados += abertos.retriesExecutados;
        erros.push(...abertos.erros.map((e) => `[abertos] ${e}`));
      }
    }

    return {
      processados,
      erros,
      contratosProcessados,
      retriesExecutados,
      lockAdquirido: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    };
  } finally {
    await releasePgAdvisoryLock(GLPI_SYNC_LOCK_KEY);
  }
}

export async function moverChamadoKanbanEGlpi(
  glpiTicketId: number,
  novaColuna: GlpiKanbanColuna
): Promise<void> {
  await atualizarChamadoGlpi(glpiTicketId, { colunaKanban: novaColuna });
}

export async function atualizarChamadoGlpi(
  glpiTicketId: number,
  input: {
    colunaKanban?: GlpiKanbanColuna;
    prioridade?: number;
    urgencia?: number;
    categoriaIdGlpi?: number;
    grupoTecnicoIdGlpi?: number;
    tecnicoResponsavelIdGlpi?: number;
  }
): Promise<void> {
  const payload: {
    status?: number;
    priority?: number;
    urgency?: number;
    itilcategories_id?: number;
    groups_id_assign?: number;
    users_id_assign?: number;
  } = {};
  const updateLocal: Record<string, unknown> = {};
  if (input.colunaKanban) {
    const novoStatus = colunaParaStatusGlpi(input.colunaKanban);
    payload.status = novoStatus;
    updateLocal.colunaKanban = input.colunaKanban;
    updateLocal.statusGlpi = novoStatus;
    updateLocal.statusLabel = statusLabelGlpi(novoStatus);
  }
  if (typeof input.prioridade === "number") {
    payload.priority = input.prioridade;
    updateLocal.prioridade = input.prioridade;
  }
  if (typeof input.urgencia === "number") {
    payload.urgency = input.urgencia;
    updateLocal.urgencia = input.urgencia;
  }
  if (typeof input.categoriaIdGlpi === "number") {
    payload.itilcategories_id = input.categoriaIdGlpi;
    updateLocal.categoriaIdGlpi = input.categoriaIdGlpi;
  }
  if (typeof input.grupoTecnicoIdGlpi === "number") {
    payload.groups_id_assign = input.grupoTecnicoIdGlpi;
    updateLocal.grupoTecnicoIdGlpi = input.grupoTecnicoIdGlpi;
  }
  if (typeof input.tecnicoResponsavelIdGlpi === "number") {
    payload.users_id_assign = input.tecnicoResponsavelIdGlpi;
    updateLocal.tecnicoResponsavelIdGlpi = input.tecnicoResponsavelIdGlpi;
  }
  if (Object.keys(payload).length === 0) return;

  try {
    await glpiWithSession(async (ctx) => {
      const { glpiUpdateTicket } = await import("@/lib/glpi-client");
      await glpiUpdateTicket(ctx, glpiTicketId, payload);
    });

    await prisma.glpiChamado.update({
      where: { glpiTicketId },
      data: {
        ...updateLocal,
        sincronizadoEm: new Date(),
        ultimoPushEm: new Date(),
        syncStatus: "OK",
        syncErro: null,
      },
    });
  } catch (e) {
    await prisma.glpiChamado.update({
      where: { glpiTicketId },
      data: {
        syncStatus: "ERRO_PUSH",
        syncErro: e instanceof Error ? e.message.slice(0, 4000) : String(e).slice(0, 4000),
      },
    });
    throw e;
  }
}
