import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { registerAudit } from "@/server/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.pendencia.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Pendência não encontrada" }, { status: 404 });

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.descricao !== undefined) data.descricao = body.descricao;
    if (body.responsavel !== undefined) data.responsavel = body.responsavel;
    if (body.prazo !== undefined) data.prazo = body.prazo ? new Date(body.prazo) : null;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "CONCLUIDA") data.concluidoEm = new Date();
    }
    if (body.origem !== undefined) data.origem = body.origem;
    if (body.tipo !== undefined) data.tipo = body.tipo;

    const pendencia = await prisma.pendencia.update({
      where: { id },
      data: data as Prisma.PendenciaUpdateInput,
    });

    await registerAudit({
      entidade: "Pendencia",
      entidadeId: id,
      acao: "ATUALIZACAO",
      valorAnterior: existing,
      valorNovo: pendencia,
      usuarioId: session.id,
    });

    return NextResponse.json(pendencia);
  } catch (e) {
    console.error("Update pendencia error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar pendência" },
      { status: 500 }
    );
  }
}
