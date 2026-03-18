import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { getOrCreateMedicao } from "@/server/services/medicao";

/** Relatório mensal: checklist (itens) + UST + valores consolidados */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id: contratoId } = await params;
  const { searchParams } = new URL(request.url);
  const ano = parseInt(searchParams.get("ano") ?? "", 10);
  const mes = parseInt(searchParams.get("mes") ?? "", 10);
  if (!ano || !mes) {
    return NextResponse.json({ message: "Informe ano e mes" }, { status: 400 });
  }

  const c = await prisma.contrato.findUnique({
    where: { id: contratoId },
    select: {
      id: true,
      nome: true,
      numeroContrato: true,
      valorUnitarioUst: true,
      totalItensVerificacao: true,
    },
  });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  const medicao = await getOrCreateMedicao(contratoId, ano, mes);
  const lancamentos = await prisma.lancamentoUst.findMany({
    where: { contratoId, competenciaAno: ano, competenciaMes: mes },
    orderBy: { criadoEm: "desc" },
    include: {
      tipoAtividade: { select: { nome: true, ustFixo: true } },
      servicoCatalogo: { select: { nome: true } },
    },
  });

  return NextResponse.json({
    contrato: c,
    competencia: { ano, mes },
    checklist: {
      totalItensValidos: medicao.totalItensValidos,
      totalItensAtendidos: medicao.totalItensAtendidos,
      totalItensParciais: medicao.totalItensParciais,
      totalItensNaoAtendidos: medicao.totalItensNaoAtendidos,
      percentualCumprido: Number(medicao.percentualCumprido),
      valorDevidoMesChecklist: Number(medicao.valorDevidoMes),
      valorGlosadoMes: Number(medicao.valorGlosadoMes),
    },
    ust: {
      totalUstMes: Number(medicao.totalUstMes),
      valorMedicaoUstMes: Number(medicao.valorMedicaoUstMes),
      lancamentos: lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipoAtividade.nome,
        quantidade: l.quantidade,
        totalUst: Number(l.totalUst),
        valorMonetario: Number(l.valorMonetario),
        evidenciaGlpi: l.evidenciaGlpiTicketId,
        evidenciaUrl: l.evidenciaUrl,
      })),
    },
    consolidado: {
      valorTotalMes: Number(medicao.valorTotalConsolidadoMes ?? 0),
      formula: "valor checklist (itens) + valor UST do mês",
    },
    statusFechamento: medicao.statusFechamento,
  });
}
