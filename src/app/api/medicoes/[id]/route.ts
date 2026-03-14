import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { recalcularMedicao, fecharMedicao } from "@/server/services/medicao";
import { StatusFechamentoMedicao } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const medicao = await prisma.medicaoMensal.findUnique({
    where: { id },
    include: { contrato: true },
  });
  if (!medicao) return NextResponse.json({ message: "Medição não encontrada" }, { status: 404 });
  return NextResponse.json(medicao);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    if (body.recalcular) {
      const medicao = await recalcularMedicao(id);
      return NextResponse.json(medicao);
    }
    if (body.statusFechamento !== undefined) {
      const status = body.statusFechamento as StatusFechamentoMedicao;
      const medicao = await fecharMedicao(id, session.id, status);
      return NextResponse.json(medicao);
    }
    const { prisma } = await import("@/lib/prisma");
    const medicao = await prisma.medicaoMensal.update({
      where: { id },
      data: { observacoes: body.observacoes },
    });
    return NextResponse.json(medicao);
  } catch (e) {
    console.error("Update medicao error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar medição" },
      { status: 500 }
    );
  }
}
