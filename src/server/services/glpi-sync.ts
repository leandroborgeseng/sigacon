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

export type SincronizarParams = {
  /** Filtro preferencial: grupos técnicos vinculados ao contrato (campo de busca configurável). */
  contratoId?: string;
  /** Alternativa: termo livre no título (quando não há grupos no contrato). */
  termoTitulo?: string;
};

/**
 * Busca tickets no GLPI e faz upsert local.
 * Com grupos vinculados ao contrato: busca por grupo técnico atribuído (OR entre grupos).
 * Sem grupos: fallback para título contém fornecedor do contrato ou termoTitulo.
 */
export async function sincronizarChamadosGlpi(params: SincronizarParams): Promise<{
  processados: number;
  erros: string[];
}> {
  const erros: string[] = [];
  const cred = await getGlpiCredentialsResolved();
  if (!cred) {
    return { processados: 0, erros: ["GLPI não configurado (use Configuração GLPI ou variáveis de ambiente)"] };
  }
  const campoGrupo = cred.campoBuscaGrupoTecnico;

  let contratoId = params.contratoId;
  let fornecedorNome: string | null = null;
  let termoLivre = params.termoTitulo?.trim();
  let gruposIds: { glpiGroupId: number }[] = [];

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
    if (!termoLivre) termoLivre = c.fornecedor;
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
    return {
      processados: 0,
      erros: [
        "Informe contratoId (com grupos GLPI ou fornecedor) ou termoTitulo para filtrar chamados",
      ],
    };
  }

  let processados = 0;
  try {
    await glpiWithSession(async (ctx) => {
      const ids = await glpiSearchTicketIds(ctx, criteria, "0-500");
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
              statusGlpi: status,
              statusLabel: null,
              colunaKanban: coluna,
              dataAbertura: t.date ? new Date(t.date) : null,
              dataModificacao: t.date_mod ? new Date(t.date_mod) : null,
              sincronizadoEm: new Date(),
            },
            update: {
              titulo,
              conteudoPreview: preview,
              urgencia: t.urgency ?? null,
              prioridade: t.priority ?? null,
              statusGlpi: status,
              colunaKanban: coluna,
              dataAbertura: t.date ? new Date(t.date) : null,
              dataModificacao: t.date_mod ? new Date(t.date_mod) : null,
              fornecedorNome: fornecedorNome ?? undefined,
              contratoId: contratoId ?? undefined,
              sincronizadoEm: new Date(),
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

export async function moverChamadoKanbanEGlpi(
  glpiTicketId: number,
  novaColuna: GlpiKanbanColuna
): Promise<void> {
  const novoStatus = colunaParaStatusGlpi(novaColuna);

  await glpiWithSession(async (ctx) => {
    const { glpiUpdateTicket } = await import("@/lib/glpi-client");
    await glpiUpdateTicket(ctx, glpiTicketId, { status: novoStatus });
  });

  await prisma.glpiChamado.update({
    where: { glpiTicketId },
    data: {
      colunaKanban: novaColuna,
      statusGlpi: novoStatus,
      sincronizadoEm: new Date(),
    },
  });
}
