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
const STATUS_NAO_ATENDE = [StatusItem.NAO_ATENDE, StatusItem.INCONCLUSIVO];

export async function getDashboardIndicators() {
  const [contratos, itensAgg, pendenciasAbertas, medicoesAtual] = await Promise.all([
    prisma.contrato.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        valorAnual: true,
        valorMensalReferencia: true,
        totalItensVerificacao: true,
      },
    }),
    prisma.itemContratual.groupBy({
      by: ["statusAtual"],
      where: {
        considerarNaMedicao: true,
        cabecalhoLogico: false,
      },
      _count: true,
    }),
    prisma.pendencia.count({ where: { status: StatusPendencia.ABERTA } }),
    prisma.medicaoMensal.findMany({
      where: {
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
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
    else if (STATUS_NAO_ATENDE.includes(g.statusAtual)) totalNaoAtendidos += count;
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
    totalModulos: await prisma.modulo.count(),
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
    const naoAtendidos = m.itens.filter((i) => STATUS_NAO_ATENDE.includes(i.statusAtual)).length;
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

