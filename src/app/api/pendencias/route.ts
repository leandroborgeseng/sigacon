import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { pendenciaSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const contratoId = searchParams.get("contratoId");

  const where: Prisma.PendenciaWhereInput = {};
  if (status) where.status = status as "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" | "VENCIDA";
  if (contratoId) where.item = { contratoId };

  const pendencias = await prisma.pendencia.findMany({
    where,
    orderBy: [{ status: "asc" }, { prazo: "asc" }],
    include: {
      item: {
        select: {
          id: true,
          descricao: true,
          numeroItem: true,
          statusAtual: true,
          modulo: { select: { nome: true, contrato: { select: { nome: true, id: true } } } },
        },
      },
    },
  });
  return NextResponse.json(pendencias);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = pendenciaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pendencia = await prisma.pendencia.create({
      data: {
        itemId: parsed.data.itemId,
        descricao: parsed.data.descricao,
        responsavel: parsed.data.responsavel ?? null,
        prazo: parsed.data.prazo ?? null,
        status: parsed.data.status,
        origem: parsed.data.origem ?? null,
        tipo: parsed.data.tipo ?? null,
      },
    });

    await registerAudit({
      entidade: "Pendencia",
      entidadeId: pendencia.id,
      acao: "CRIACAO",
      valorNovo: pendencia,
      usuarioId: session.id,
    });

    return NextResponse.json(pendencia);
  } catch (e) {
    console.error("Create pendencia error:", e);
    return NextResponse.json(
      { message: "Erro ao criar pendência" },
      { status: 500 }
    );
  }
}
