import { prisma } from "@/lib/prisma";
import { StatusItem, StatusFechamentoMedicao } from "@prisma/client";
import {
  calcularMedicaoMensal,
  calcularPesoPercentualPorItem,
  toDecimal,
} from "@/lib/finance";

const STATUS_CONSIDERADO_ATENDIDO = [StatusItem.ATENDE];
const STATUS_CONSIDERADO_PARCIAL = [StatusItem.PARCIAL];
const STATUS_CONSIDERADO_NAO_ATENDIDO = [StatusItem.NAO_ATENDE, StatusItem.INCONCLUSIVO];
const STATUS_EXCLUIDOS_MEDICAO = [StatusItem.CABECALHO, StatusItem.DESCONSIDERADO, StatusItem.NAO_SE_APLICA];

export async function getOrCreateMedicao(contratoId: string, ano: number, mes: number) {
  const contrato = await prisma.contrato.findUniqueOrThrow({
    where: { id: contratoId },
  });

  const valorAnual = Number(contrato.valorAnual);
  const itens = await prisma.itemContratual.findMany({
    where: {
      contratoId,
      considerarNaMedicao: true,
      cabecalhoLogico: false,
    },
  });

  const totalItensValidos = itens.length;

  const avaliacoesNaCompetencia = await prisma.avaliacaoItem.findMany({
    where: {
      itemId: { in: itens.map((i) => i.id) },
      competenciaAno: ano,
      competenciaMes: mes,
    },
    orderBy: { criadoEm: "desc" },
    distinct: ["itemId"],
  });

  const statusPorItem = new Map(
    avaliacoesNaCompetencia.map((a) => [a.itemId, a.status])
  );

  let totalItensAtendidos = 0;
  let totalItensParciais = 0;
  let totalItensNaoAtendidos = 0;

  for (const item of itens) {
    const status = statusPorItem.get(item.id) ?? item.statusAtual;
    if (STATUS_CONSIDERADO_ATENDIDO.includes(status)) totalItensAtendidos++;
    else if (STATUS_CONSIDERADO_PARCIAL.includes(status)) totalItensParciais++;
    else if (STATUS_EXCLUIDOS_MEDICAO.includes(status)) {
      // já não entram em totalItensValidos pois filtramos por considerarNaMedicao e cabecalhoLogico
    } else totalItensNaoAtendidos++;
  }

  const calc = calcularMedicaoMensal({
    totalItensValidos,
    totalItensAtendidos,
    totalItensParciais,
    totalItensNaoAtendidos,
    valorAnualContrato: valorAnual,
  });

  const valorMensalRef =
    Number(contrato.valorMensalReferencia) ||
    valorAnual / 12;

  const existing = await prisma.medicaoMensal.findUnique({
    where: {
      contratoId_ano_mes: { contratoId, ano, mes },
    },
  });

  const data = {
    contratoId,
    ano,
    mes,
    totalItensValidos,
    totalItensAtendidos,
    totalItensParciais,
    totalItensNaoAtendidos,
    percentualCumprido: toDecimal(calc.percentualCumprido),
    percentualNaoCumprido: toDecimal(calc.percentualNaoCumprido),
    valorAnualContrato: toDecimal(valorAnual),
    valorMensalReferencia: toDecimal(calc.valorMensalReferencia),
    valorDevidoMes: toDecimal(calc.valorDevidoMes),
    valorGlosadoMes: toDecimal(calc.valorGlosadoMes),
  };

  if (existing) {
    return prisma.medicaoMensal.update({
      where: { id: existing.id },
      data: {
        ...data,
        totalItensValidos,
        totalItensAtendidos,
        totalItensParciais,
        totalItensNaoAtendidos,
      },
    });
  }

  return prisma.medicaoMensal.create({
    data: {
      ...data,
      totalItensValidos,
      totalItensAtendidos,
      totalItensParciais,
      totalItensNaoAtendidos,
    },
  });
}

export async function recalcularMedicao(medicaoId: string) {
  const medicao = await prisma.medicaoMensal.findUniqueOrThrow({
    where: { id: medicaoId },
  });
  return getOrCreateMedicao(medicao.contratoId, medicao.ano, medicao.mes);
}

export async function fecharMedicao(
  medicaoId: string,
  usuarioId: string,
  status: StatusFechamentoMedicao = StatusFechamentoMedicao.FECHADA
) {
  return prisma.medicaoMensal.update({
    where: { id: medicaoId },
    data: {
      statusFechamento: status,
      fechadoPorUsuarioId: usuarioId,
      fechadoEm: new Date(),
    },
  });
}
