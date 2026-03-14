import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { moduloSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const modulo = await prisma.modulo.findUnique({
    where: { id },
    include: {
      contrato: true,
      itens: true,
      _count: { select: { itens: true } },
    },
  });
  if (!modulo) return NextResponse.json({ message: "Módulo não encontrado" }, { status: 404 });
  return NextResponse.json(modulo);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.modulo.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Módulo não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = moduloSchema.partial().safeParse({ ...body, contratoId: existing.contratoId });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const modulo = await prisma.modulo.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        descricao: parsed.data.descricao,
        implantado: parsed.data.implantado,
        ativo: parsed.data.ativo,
      },
    });

    await registerAudit({
      entidade: "Modulo",
      entidadeId: id,
      acao: "ATUALIZACAO",
      valorAnterior: existing,
      valorNovo: modulo,
      usuarioId: session.id,
    });

    return NextResponse.json(modulo);
  } catch (e) {
    console.error("Update modulo error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar módulo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.modulo.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Módulo não encontrado" }, { status: 404 });

  try {
    await prisma.modulo.delete({ where: { id } });
    await registerAudit({
      entidade: "Modulo",
      entidadeId: id,
      acao: "EXCLUSAO",
      valorAnterior: existing,
      usuarioId: session.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete modulo error:", e);
    return NextResponse.json(
      { message: "Erro ao excluir módulo (pode haver itens vinculados)" },
      { status: 500 }
    );
  }
}
