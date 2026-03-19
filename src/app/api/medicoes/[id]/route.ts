import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { recalcularMedicao, fecharMedicao } from "@/server/services/medicao";
import { PerfilUsuario, RecursoPermissao, StatusFechamentoMedicao } from "@prisma/client";

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
  const podeEditar = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.MEDICOES,
    "editar"
  );
  try {
    const body = await request.json();
    if (body.recalcular) {
      if (!podeEditar) {
        return NextResponse.json({ message: "Sem permissão para recalcular medição" }, { status: 403 });
      }
      const medicao = await recalcularMedicao(id);
      return NextResponse.json(medicao);
    }
    if (body.statusFechamento !== undefined) {
      if (!podeEditar) {
        return NextResponse.json({ message: "Sem permissão para alterar fechamento" }, { status: 403 });
      }
      const status = body.statusFechamento as StatusFechamentoMedicao;
      const medicao = await fecharMedicao(id, session.id, status);
      return NextResponse.json(medicao);
    }
    if (!podeEditar) {
      return NextResponse.json({ message: "Sem permissão para editar medição" }, { status: 403 });
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
