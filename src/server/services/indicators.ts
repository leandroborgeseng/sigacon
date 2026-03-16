import { prisma } from "@/lib/prisma";
import { StatusItem } from "@prisma/client";
import { StatusPendencia } from "@prisma/client";

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

