import { prisma } from "@/lib/prisma";
import { GlpiKanbanColuna, StatusContrato, StatusItem, StatusPendencia } from "@prisma/client";
import { mapTotaisUstPorContratoNoAno } from "@/lib/ust-limits";

const STATUS_CONTRATO_LABEL: Record<StatusContrato, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  SUSPENSO: "Suspenso",
  EM_IMPLANTACAO: "Em implantação",
  EM_AVALIACAO: "Em avaliação",
};

const STATUS_VALIDOS_MEDICAO = [
  StatusItem.ATENDE,
  StatusItem.NAO_ATENDE,
  StatusItem.PARCIAL,
  StatusItem.INCONCLUSIVO,
  StatusItem.NAO_SE_APLICA,
  StatusItem.DESCONSIDERADO,
];
const STATUS_ATENDIDO = StatusItem.ATENDE;
const STATUS_PARCIAL = StatusItem.PARCIAL;

const itemWhereBase = {
  considerarNaMedicao: true,
  cabecalhoLogico: false,
} as const;

export async function getDashboardIndicators(contratoId?: string) {
  const contratoWhere = contratoId ? { id: contratoId, status: "ATIVO" as const } : { status: "ATIVO" as const };
  const itemWhere = contratoId
    ? { ...itemWhereBase, contratoId }
    : itemWhereBase;

  const [contratos, itensAgg, pendenciasAbertas, medicoesAtual] = await Promise.all([
    prisma.contrato.findMany({
      where: contratoWhere,
      select: {
        id: true,
        valorAnual: true,
        valorMensalReferencia: true,
        totalItensVerificacao: true,
      },
    }),
    prisma.itemContratual.groupBy({
      by: ["statusAtual"],
      where: itemWhere,
      _count: true,
    }),
    contratoId
      ? prisma.pendencia.count({
          where: {
            status: StatusPendencia.ABERTA,
            item: { contratoId },
          },
        })
      : prisma.pendencia.count({ where: { status: StatusPendencia.ABERTA } }),
    prisma.medicaoMensal.findMany({
      where: {
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        ...(contratoId ? { contratoId } : {}),
      },
      include: { contrato: true },
    }),
  ]);

  const totalContratos = contratos.length;
  const valorAnualTotal = contratos.reduce((s, c) => s + Number(c.valorAnual), 0);
  const valorMensalRefTotal = contratos.reduce(
    (s, c) => s + Number(c.valorMensalReferencia ?? 0),
    0
  );

  let totalItensValidos = 0;
  let totalAtendidos = 0;
  let totalParciais = 0;
  let totalNaoAtendidos = 0;

  for (const g of itensAgg) {
    const count = g._count;
    totalItensValidos += count;
    if (g.statusAtual === STATUS_ATENDIDO) totalAtendidos = count;
    else if (g.statusAtual === STATUS_PARCIAL) totalParciais = count;
    else if (g.statusAtual === StatusItem.NAO_ATENDE || g.statusAtual === StatusItem.INCONCLUSIVO)
      totalNaoAtendidos += count;
  }

  const percentualGeral =
    totalItensValidos > 0 ? (totalAtendidos / totalItensValidos) * 100 : 0;
  const valorDevidoMes = medicoesAtual.reduce(
    (s, m) => s + Number(m.valorDevidoMes),
    0
  );
  const valorGlosadoMes = medicoesAtual.reduce(
    (s, m) => s + Number(m.valorGlosadoMes),
    0
  );

  return {
    totalContratos,
    totalModulos: await prisma.modulo.count({
      where: contratoId ? { contratoId } : undefined,
    }),
    totalItensValidos,
    totalAtendidos,
    totalParciais,
    totalNaoAtendidos,
    pendenciasAbertas: pendenciasAbertas,
    valorAnualTotal,
    valorMensalRefTotal,
    valorDevidoMes,
    valorGlosadoMes,
    percentualGeral,
  };
}

export async function getIndicadoresPorModulo(contratoId?: string) {
  const where = contratoId ? { contratoId } : {};
  const modulos = await prisma.modulo.findMany({
    where: { ...where, ativo: true },
    include: {
      _count: { select: { itens: true } },
      itens: {
        where: { considerarNaMedicao: true, cabecalhoLogico: false },
        select: { id: true, statusAtual: true },
      },
      contrato: { select: { nome: true } },
    },
  });

  const itemToModulo = new Map<string, string>();
  const allItemIds: string[] = [];
  for (const m of modulos) {
    for (const i of m.itens) {
      itemToModulo.set(i.id, m.id);
      allItemIds.push(i.id);
    }
  }
  const pendenciasPorModulo = await prisma.pendencia.groupBy({
    by: ["itemId"],
    where: { status: StatusPendencia.ABERTA, itemId: { in: allItemIds } },
  });
  const pendenciasCount = new Map<string, number>();
  for (const p of pendenciasPorModulo) {
    const modId = itemToModulo.get(p.itemId);
    if (modId) pendenciasCount.set(modId, (pendenciasCount.get(modId) ?? 0) + 1);
  }

  return modulos.map((m) => {
    const total = m.itens.length;
    const atendidos = m.itens.filter((i) => i.statusAtual === STATUS_ATENDIDO).length;
    const parciais = m.itens.filter((i) => i.statusAtual === STATUS_PARCIAL).length;
    const naoAtendidos = m.itens.filter(
      (i) => i.statusAtual === StatusItem.NAO_ATENDE || i.statusAtual === StatusItem.INCONCLUSIVO
    ).length;
    const percentual = total > 0 ? (atendidos / total) * 100 : 0;
    return {
      id: m.id,
      nome: m.nome,
      contratoNome: m.contrato.nome,
      totalItens: total,
      atendidos,
      parciais,
      naoAtendidos,
      percentualAtendimento: percentual,
      pendenciasAbertas: pendenciasCount.get(m.id) ?? 0,
    };
  });
}

/** Insights operacionais: medição, UST no mês, carteira de contratos, módulos críticos. */
export async function getDashboardInsights(contratoId?: string) {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;

  const ativos = await prisma.contrato.findMany({
    where: {
      status: "ATIVO",
      ativo: true,
      ...(contratoId ? { id: contratoId } : {}),
    },
    select: { id: true, nome: true },
  });
  const ids = ativos.map((c) => c.id);

  const medicoesMes = await prisma.medicaoMensal.findMany({
    where: {
      ano,
      mes,
      contratoId: contratoId ? contratoId : { in: ids.length ? ids : ["__none__"] },
    },
    select: { contratoId: true },
  });
  const comMedicao = new Set(medicoesMes.map((m) => m.contratoId));
  const semMedicaoNoMes = ativos.filter((c) => !comMedicao.has(c.id)).slice(0, 15);

  const ustWhere = {
    competenciaAno: ano,
    competenciaMes: mes,
    ...(contratoId ? { contratoId } : {}),
  };
  const [ustCount, ustSum] = await Promise.all([
    prisma.lancamentoUst.count({ where: ustWhere }),
    prisma.lancamentoUst.aggregate({
      where: ustWhere,
      _sum: { totalUst: true, valorMonetario: true },
    }),
  ]);

  const statusDistrib = await prisma.contrato.groupBy({
    by: ["status"],
    _count: true,
  });

  const modulos = await getIndicadoresPorModulo(contratoId);
  const modulosCriticos = [...modulos]
    .filter((m) => m.totalItens >= 2 && m.percentualAtendimento < 100)
    .sort((a, b) => a.percentualAtendimento - b.percentualAtendimento)
    .slice(0, 6);

  return {
    competenciaLabel: `${String(mes).padStart(2, "0")}/${ano}`,
    semMedicaoNoMes: semMedicaoNoMes.map((c) => ({ id: c.id, nome: c.nome })),
    ustMes: {
      lancamentos: ustCount,
      totalUst: Number(ustSum._sum.totalUst ?? 0),
      valor: Number(ustSum._sum.valorMonetario ?? 0),
    },
    carteiraContratos: statusDistrib.map((s) => ({
      status: s.status,
      label: STATUS_CONTRATO_LABEL[s.status],
      count: s._count,
    })),
    modulosCriticos: modulosCriticos.map((m) => ({
      id: m.id,
      nome: m.nome,
      contratoNome: m.contratoNome,
      percentual: Math.round(m.percentualAtendimento * 10) / 10,
      pendencias: m.pendenciasAbertas,
      totalItens: m.totalItens,
    })),
  };
}

/** Alertas: vigência nos próximos 90 dias e consumo UST ≥85% do teto anual. */
export async function getDashboardAlertas(contratoId?: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em90 = new Date(hoje);
  em90.setDate(em90.getDate() + 90);

  const baseContrato = {
    ativo: true,
    status: "ATIVO" as const,
    ...(contratoId ? { id: contratoId } : {}),
  };

  const vencendo90Dias = await prisma.contrato.findMany({
    where: {
      ...baseContrato,
      vigenciaFim: { gte: hoje, lte: em90 },
    },
    select: {
      id: true,
      nome: true,
      numeroContrato: true,
      vigenciaFim: true,
    },
    orderBy: { vigenciaFim: "asc" },
    take: 25,
  });

  const comLimite = await prisma.contrato.findMany({
    where: {
      ...baseContrato,
      OR: [{ limiteUstAno: { not: null } }, { limiteValorUstAno: { not: null } }],
    },
    select: {
      id: true,
      nome: true,
      limiteUstAno: true,
      limiteValorUstAno: true,
    },
    take: contratoId ? 1 : 40,
  });

  const ano = new Date().getFullYear();
  const ustProximoTeto: Array<{
    id: string;
    nome: string;
    mensagem: string;
    severidade: "aviso" | "critico";
  }> = [];

  const totaisMap = await mapTotaisUstPorContratoNoAno(
    comLimite.map((c) => c.id),
    ano
  );

  for (const c of comLimite) {
    const t = totaisMap.get(c.id) ?? { totalUst: 0, totalValor: 0 };
    const lu = c.limiteUstAno != null ? Number(c.limiteUstAno) : null;
    const lv = c.limiteValorUstAno != null ? Number(c.limiteValorUstAno) : null;
    let mensagem: string | null = null;
    let severidade: "aviso" | "critico" = "aviso";

    if (lu && lu > 0) {
      const pct = (t.totalUst / lu) * 100;
      if (pct >= 100) {
        mensagem = `UST no ano: ${t.totalUst.toFixed(1)} / ${lu} — teto atingido ou excedido.`;
        severidade = "critico";
      } else if (pct >= 85) {
        mensagem = `UST no ano: ${t.totalUst.toFixed(1)} / ${lu} (${pct.toFixed(0)}% do teto).`;
      }
    }
    if (!mensagem && lv && lv > 0) {
      const pct = (t.totalValor / lv) * 100;
      if (pct >= 100) {
        mensagem = `Valor UST no ano: ${t.totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / ${lv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — teto atingido.`;
        severidade = "critico";
      } else if (pct >= 85) {
        mensagem = `Valor UST no ano em ${pct.toFixed(0)}% do teto contratual.`;
      }
    }
    if (mensagem) {
      ustProximoTeto.push({ id: c.id, nome: c.nome, mensagem, severidade });
    }
  }

  return {
    vencendo90Dias: vencendo90Dias.map((v) => ({
      id: v.id,
      nome: v.nome,
      numeroContrato: v.numeroContrato,
      vigenciaFim: v.vigenciaFim.toISOString(),
    })),
    ustProximoTeto,
  };
}

/** Resumo GLPI para gestão: volume por contrato e chamados sem interação há 7+ dias. */
export async function getDashboardGlpiResumo(contratoId?: string) {
  // Segue a mesma lógica do Kanban:
  // quando houver filtro por contrato, o agrupamento é feito pelos grupos técnicos cadastrados no contrato,
  // e não pela coluna `contratoId` gravada no chamado (que pode estar nula em alguns cenários).

  const contratos = await prisma.contrato.findMany({
    where: contratoId ? { id: contratoId, status: "ATIVO" } : { status: "ATIVO" },
    select: {
      id: true,
      nome: true,
      glpiGruposTecnicos: { select: { glpiGroupId: true } },
    },
  });

  const ondeAbertos = {
    colunaKanban: { not: GlpiKanbanColuna.FECHADO } as const,
  };
  const limiteSemInteracao = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const contratosComGrupos = contratos
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      grupos: c.glpiGruposTecnicos.map((g) => g.glpiGroupId).filter((id) => Number.isFinite(id)),
    }))
    .filter((c) => c.grupos.length > 0);

  const idsGrupos = [...new Set(contratosComGrupos.flatMap((c) => c.grupos))];
  if (idsGrupos.length === 0) {
    return { totalAbertos: 0, porContrato: [], semInteracao: [] };
  }

  const totalAbertos = await prisma.glpiChamado.count({
    where: {
      ...ondeAbertos,
      grupoTecnicoIdGlpi: { in: idsGrupos },
    },
  });

  const porContrato = await Promise.all(
    contratosComGrupos.map(async (c) => {
      const totalChamados = await prisma.glpiChamado.count({
        where: {
          ...ondeAbertos,
          grupoTecnicoIdGlpi: { in: c.grupos },
        },
      });
      return { contratoId: c.id, contratoNome: c.nome, totalChamados };
    })
  );

  // Mapeia grupo técnico -> contrato (para rotular o ticket sem depender de `contratoId` no chamado).
  const gruposParaContratos = new Map<number, Array<{ contratoId: string; contratoNome: string }>>();
  for (const c of contratosComGrupos) {
    for (const gid of c.grupos) {
      const arr = gruposParaContratos.get(gid) ?? [];
      arr.push({ contratoId: c.id, contratoNome: c.nome });
      gruposParaContratos.set(gid, arr);
    }
  }

  const semInteracaoChamados = await prisma.glpiChamado.findMany({
    where: {
      ...ondeAbertos,
      grupoTecnicoIdGlpi: { in: idsGrupos },
      OR: [
        { dataModificacao: { lte: limiteSemInteracao } },
        { dataModificacao: null, ultimoPullEm: { lte: limiteSemInteracao } },
      ],
    },
    orderBy: [{ dataModificacao: "asc" }, { ultimoPullEm: "asc" }],
    take: 50,
  });

  const semInteracao = semInteracaoChamados
    .filter((c) => c.grupoTecnicoIdGlpi != null)
    .map((c) => {
      const gid = c.grupoTecnicoIdGlpi as number;
      const matches = gruposParaContratos.get(gid) ?? [];
      const contrato = matches[0];
      return {
        id: c.id,
        glpiTicketId: c.glpiTicketId,
        titulo: c.titulo,
        contratoId: contrato?.contratoId ?? "unknown",
        contratoNome: contrato?.contratoNome ?? "Contrato",
        dataUltimaInteracao: (c.dataModificacao ?? c.ultimoPullEm ?? c.sincronizadoEm).toISOString(),
        statusLabel: c.statusLabel,
        colunaKanban: c.colunaKanban,
      };
    });

  return { totalAbertos, porContrato, semInteracao };
}

