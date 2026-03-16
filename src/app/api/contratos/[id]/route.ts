import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { contratoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";
import { calcularValorMensalReferencia } from "@/lib/finance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      modulos: true,
      _count: { select: { itens: true } },
      medicoes: { orderBy: [{ ano: "desc" }, { mes: "desc" }], take: 12 },
      atas: { orderBy: { dataReuniao: "desc" }, take: 10 },
      reajustes: { orderBy: { dataReajuste: "desc" } },
    },
  });
  if (!contrato) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  return NextResponse.json(contrato);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.contrato.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = contratoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const valorAnual = parsed.data.valorAnual ?? Number(existing.valorAnual);
    const valorMensal =
      parsed.data.valorMensalReferencia ??
      (Number(existing.valorMensalReferencia) || calcularValorMensalReferencia(valorAnual));

    const contrato = await prisma.contrato.update({
      where: { id },
      data: {
        ...(parsed.data.nome != null && { nome: parsed.data.nome }),
        ...(parsed.data.numeroContrato != null && { numeroContrato: parsed.data.numeroContrato }),
        ...(parsed.data.fornecedor != null && { fornecedor: parsed.data.fornecedor }),
        ...(parsed.data.objeto !== undefined && { objeto: parsed.data.objeto }),
        ...(parsed.data.vigenciaInicio != null && { vigenciaInicio: parsed.data.vigenciaInicio }),
        ...(parsed.data.vigenciaFim != null && { vigenciaFim: parsed.data.vigenciaFim }),
        ...(parsed.data.valorAnual != null && { valorAnual: parsed.data.valorAnual }),
        valorMensalReferencia: valorMensal,
        ...(parsed.data.status != null && { status: parsed.data.status }),
        ...(parsed.data.gestorContrato !== undefined && { gestorContrato: parsed.data.gestorContrato }),
        ...(parsed.data.observacoesGerais !== undefined && { observacoesGerais: parsed.data.observacoesGerais }),
        ...(parsed.data.formaCalculoMedicao != null && { formaCalculoMedicao: parsed.data.formaCalculoMedicao }),
        ...(parsed.data.leiLicitacao != null && { leiLicitacao: parsed.data.leiLicitacao }),
        ...(parsed.data.dataAssinatura !== undefined && { dataAssinatura: parsed.data.dataAssinatura }),
        ...(parsed.data.numeroRenovacoes !== undefined && { numeroRenovacoes: parsed.data.numeroRenovacoes }),
      },
    });

    await registerAudit({
      entidade: "Contrato",
      entidadeId: id,
      acao: "ATUALIZACAO",
      valorAnterior: existing,
      valorNovo: contrato,
      usuarioId: session.id,
    });

    return NextResponse.json(contrato);
  } catch (e) {
    console.error("Update contrato error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar contrato" },
      { status: 500 }
    );
  }
}
