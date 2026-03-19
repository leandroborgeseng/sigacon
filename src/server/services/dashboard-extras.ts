import { prisma } from "@/lib/prisma";
import { StatusPendencia } from "@prisma/client";

export type TarefaMes = {
  tipo: "SEM_MEDICAO" | "PENDENCIAS_CONTRATO" | "UST_SEM_EVIDENCIA";
  titulo: string;
  detalhe: string;
  href: string;
  contratoId?: string;
  contratoNome?: string;
};

/** Tarefas sugeridas para o mês (operacional). */
export async function getDashboardTarefasMes(contratoId?: string, limite = 12): Promise<TarefaMes[]> {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;
  const tarefas: TarefaMes[] = [];

  const ativos = await prisma.contrato.findMany({
    where: {
      status: "ATIVO",
      ativo: true,
      ...(contratoId ? { id: contratoId } : {}),
    },
    select: { id: true, nome: true },
  });
  const ids = ativos.map((c) => c.id);
  if (ids.length === 0) return tarefas;

  const comMed = await prisma.medicaoMensal.findMany({
    where: {
      ano,
      mes,
      contratoId: contratoId ? contratoId : { in: ids },
    },
    select: { contratoId: true },
  });
  const setMed = new Set(comMed.map((m) => m.contratoId));
  for (const c of ativos) {
    if (!setMed.has(c.id)) {
      tarefas.push({
        tipo: "SEM_MEDICAO",
        titulo: "Registrar medição do mês",
        detalhe: c.nome,
        href: `/medicoes?contratoId=${c.id}`,
        contratoId: c.id,
        contratoNome: c.nome,
      });
    }
  }

  const pendPorContrato = await prisma.pendencia.groupBy({
    by: ["itemId"],
    where: {
      status: StatusPendencia.ABERTA,
      item: { contratoId: contratoId ? contratoId : { in: ids } },
    },
    _count: true,
  });
  const itemIds = pendPorContrato.map((p) => p.itemId);
  const itens = await prisma.itemContratual.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, contratoId: true, contrato: { select: { nome: true } } },
  });
  const mapContrato = new Map<string, number>();
  for (const p of pendPorContrato) {
    const item = itens.find((i) => i.id === p.itemId);
    if (!item) continue;
    mapContrato.set(item.contratoId, (mapContrato.get(item.contratoId) ?? 0) + p._count);
  }
  for (const [cid, n] of mapContrato) {
    if (n >= 3) {
      const nome = ativos.find((a) => a.id === cid)?.nome ?? "Contrato";
      tarefas.push({
        tipo: "PENDENCIAS_CONTRATO",
        titulo: `${n} pendências abertas`,
        detalhe: nome,
        href: `/pendencias`,
        contratoId: cid,
        contratoNome: nome,
      });
    }
  }

  const ustSem = await prisma.lancamentoUst.findMany({
    where: {
      competenciaAno: ano,
      competenciaMes: mes,
      contratoId: contratoId ? contratoId : { in: ids },
      evidenciaGlpiTicketId: null,
      evidenciaUrl: null,
      anexoEvidencia: null,
      OR: [{ evidenciaDescricao: null }, { evidenciaDescricao: "" }],
    },
    select: { contratoId: true, contrato: { select: { nome: true } } },
    take: 8,
  });
  const seen = new Set<string>();
  for (const u of ustSem) {
    if (seen.has(u.contratoId)) continue;
    seen.add(u.contratoId);
    tarefas.push({
      tipo: "UST_SEM_EVIDENCIA",
      titulo: "UST no mês sem evidência completa",
      detalhe: u.contrato.nome,
      href: `/execucao-tecnica`,
      contratoId: u.contratoId,
      contratoNome: u.contrato.nome,
    });
  }

  return tarefas.slice(0, limite);
}

export type PontoSerie = {
  label: string;
  ano: number;
  mes: number;
  valorDevido: number;
  valorGlosado: number;
  percentualMedio: number;
  medicoesCount: number;
};

/** Série dos últimos N meses (soma ou média das medições no período). */
export async function getDashboardSerieTempo(contratoId?: string, meses = 12): Promise<PontoSerie[]> {
  const now = new Date();
  const pontos: { ano: number; mes: number; label: string }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    pontos.push({
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
      label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
    });
  }
  const batches = await Promise.all(
    pontos.map((p) =>
      prisma.medicaoMensal.findMany({
        where: {
          ano: p.ano,
          mes: p.mes,
          ...(contratoId ? { contratoId } : {}),
        },
        select: {
          valorDevidoMes: true,
          valorGlosadoMes: true,
          percentualCumprido: true,
        },
      })
    )
  );
  return pontos.map((p, idx) => {
    const rows = batches[idx];
    let vd = 0;
    let vg = 0;
    let pctSum = 0;
    for (const r of rows) {
      vd += Number(r.valorDevidoMes);
      vg += Number(r.valorGlosadoMes);
      pctSum += Number(r.percentualCumprido);
    }
    return {
      label: p.label,
      ano: p.ano,
      mes: p.mes,
      valorDevido: vd,
      valorGlosado: vg,
      percentualMedio: rows.length ? pctSum / rows.length : 0,
      medicoesCount: rows.length,
    };
  });
}
