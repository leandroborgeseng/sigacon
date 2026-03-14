import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OrigemAvaliacao } from "@prisma/client";
import { registerAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.itemContratual.findUnique({
    where: { id },
    include: {
      modulo: true,
      contrato: true,
      avaliacoes: { orderBy: { criadoEm: "desc" }, take: 50 },
      pendencias: true,
      anexos: true,
    },
  });
  if (!item) return NextResponse.json({ message: "Item não encontrado" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.itemContratual.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Item não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const { statusAtual, observacaoAtual, ...rest } = body;

    const updateData: Record<string, unknown> = { ...rest };
    if (statusAtual !== undefined) updateData.statusAtual = statusAtual;
    if (observacaoAtual !== undefined) updateData.observacaoAtual = observacaoAtual;

    const item = await prisma.itemContratual.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.itemContratual.update>[0]["data"],
    });

    if (statusAtual !== undefined && statusAtual !== existing.statusAtual) {
      const now = new Date();
      await prisma.avaliacaoItem.create({
        data: {
          itemId: id,
          dataAvaliacao: now,
          competenciaAno: now.getFullYear(),
          competenciaMes: now.getMonth() + 1,
          status: statusAtual,
          observacao: observacaoAtual ?? existing.observacaoAtual,
          usuarioId: session.id,
          origem: OrigemAvaliacao.MANUAL,
        },
      });
      await registerAudit({
        entidade: "ItemContratual",
        entidadeId: id,
        acao: "ALTERACAO_STATUS",
        valorAnterior: { statusAtual: existing.statusAtual },
        valorNovo: { statusAtual: statusAtual },
        usuarioId: session.id,
      });
    }

    return NextResponse.json(item);
  } catch (e) {
    console.error("Update item error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar item" },
      { status: 500 }
    );
  }
}
