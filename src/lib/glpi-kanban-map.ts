import { GlpiKanbanColuna } from "@prisma/client";

/**
 * Mapeamento coluna Kanban ↔ status numérico do GLPI (Helpdesk).
 * Valores típicos GLPI 9/10/11 (ajuste via GLPI_KANBAN_MAP no .env se o seu catálogo for diferente).
 */
export type KanbanMapConfig = {
  /** status GLPI → coluna do quadro */
  statusToColuna: Record<number, GlpiKanbanColuna>;
  /** coluna do quadro → status GLPI ao mover o card (push para o GLPI) */
  colunaToStatus: Record<GlpiKanbanColuna, number>;
};

const PADRAO: KanbanMapConfig = {
  statusToColuna: {
    1: GlpiKanbanColuna.BACKLOG,
    2: GlpiKanbanColuna.EM_ANDAMENTO,
    3: GlpiKanbanColuna.EM_ANDAMENTO,
    4: GlpiKanbanColuna.AGUARDANDO,
    5: GlpiKanbanColuna.RESOLVIDO,
    6: GlpiKanbanColuna.FECHADO,
  },
  colunaToStatus: {
    [GlpiKanbanColuna.BACKLOG]: 1,
    [GlpiKanbanColuna.EM_ANDAMENTO]: 2,
    [GlpiKanbanColuna.AGUARDANDO]: 4,
    [GlpiKanbanColuna.RESOLVIDO]: 5,
    [GlpiKanbanColuna.FECHADO]: 6,
  },
};

function parseEnvMap(): KanbanMapConfig | null {
  const raw = process.env.GLPI_KANBAN_MAP?.trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as {
      statusToColuna?: Record<string, string>;
      colunaToStatus?: Record<string, number>;
    };
    const stc: Record<number, GlpiKanbanColuna> = {};
    for (const [k, v] of Object.entries(j.statusToColuna ?? {})) {
      stc[Number(k)] = v as GlpiKanbanColuna;
    }
    const cts = j.colunaToStatus as Record<GlpiKanbanColuna, number>;
    return { statusToColuna: stc, colunaToStatus: cts };
  } catch {
    return null;
  }
}

export function getKanbanMap(): KanbanMapConfig {
  return parseEnvMap() ?? PADRAO;
}

export function statusGlpiParaColuna(statusId: number): GlpiKanbanColuna {
  const m = getKanbanMap().statusToColuna;
  return m[statusId] ?? GlpiKanbanColuna.EM_ANDAMENTO;
}

export function colunaParaStatusGlpi(col: GlpiKanbanColuna): number {
  return getKanbanMap().colunaToStatus[col];
}

export const GLPI_KANBAN_LABELS: Record<GlpiKanbanColuna, string> = {
  [GlpiKanbanColuna.BACKLOG]: "Backlog (novos)",
  [GlpiKanbanColuna.EM_ANDAMENTO]: "Em andamento",
  [GlpiKanbanColuna.AGUARDANDO]: "Aguardando",
  [GlpiKanbanColuna.RESOLVIDO]: "Resolvido",
  [GlpiKanbanColuna.FECHADO]: "Fechado",
};

export const ORDEM_COLUNAS: GlpiKanbanColuna[] = [
  GlpiKanbanColuna.BACKLOG,
  GlpiKanbanColuna.EM_ANDAMENTO,
  GlpiKanbanColuna.AGUARDANDO,
  GlpiKanbanColuna.RESOLVIDO,
  GlpiKanbanColuna.FECHADO,
];
