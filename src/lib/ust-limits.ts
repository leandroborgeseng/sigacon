import { prisma } from "@/lib/prisma";

export async function totaisUstNoAno(contratoId: string, ano: number, excluirLancamentoId?: string) {
  const agg = await prisma.lancamentoUst.aggregate({
    where: {
      contratoId,
      competenciaAno: ano,
      ...(excluirLancamentoId ? { id: { not: excluirLancamentoId } } : {}),
    },
    _sum: { totalUst: true, valorMonetario: true },
  });
  return {
    totalUst: Number(agg._sum.totalUst ?? 0),
    totalValor: Number(agg._sum.valorMonetario ?? 0),
  };
}

/** Uma consulta agregada para vários contratos (evita N+1 no dashboard). */
export async function mapTotaisUstPorContratoNoAno(contratoIds: string[], ano: number) {
  const map = new Map<string, { totalUst: number; totalValor: number }>();
  for (const id of contratoIds) {
    map.set(id, { totalUst: 0, totalValor: 0 });
  }
  if (contratoIds.length === 0) return map;
  const sums = await prisma.lancamentoUst.groupBy({
    by: ["contratoId"],
    where: { contratoId: { in: contratoIds }, competenciaAno: ano },
    _sum: { totalUst: true, valorMonetario: true },
  });
  for (const s of sums) {
    map.set(s.contratoId, {
      totalUst: Number(s._sum.totalUst ?? 0),
      totalValor: Number(s._sum.valorMonetario ?? 0),
    });
  }
  return map;
}

export function validarLimitesUst(params: {
  limiteUstAno: number | null;
  limiteValorUstAno: number | null;
  ustAtualAno: number;
  valorAtualAno: number;
  ustAdicionar: number;
  valorAdicionar: number;
}): { ok: true } | { ok: false; message: string } {
  const { limiteUstAno, limiteValorUstAno, ustAtualAno, valorAtualAno, ustAdicionar, valorAdicionar } = params;
  const novoUst = ustAtualAno + ustAdicionar;
  const novoValor = valorAtualAno + valorAdicionar;
  if (limiteUstAno != null && limiteUstAno > 0 && novoUst > limiteUstAno) {
    return {
      ok: false,
      message: `Limite anual de UST excedido: ${novoUst.toFixed(2)} > ${limiteUstAno} (teto contratual).`,
    };
  }
  if (limiteValorUstAno != null && limiteValorUstAno > 0 && novoValor > limiteValorUstAno) {
    return {
      ok: false,
      message: `Limite anual em R$ (UST) excedido: ${novoValor.toFixed(2)} > ${limiteValorUstAno}.`,
    };
  }
  return { ok: true };
}
