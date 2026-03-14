import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { moduloSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");

  const where = contratoId ? { contratoId } : {};
  const modulos = await prisma.modulo.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      contrato: { select: { nome: true } },
      _count: { select: { itens: true } },
    },
  });
  return NextResponse.json(modulos);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = moduloSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const modulo = await prisma.modulo.create({
      data: {
        contratoId: parsed.data.contratoId,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao ?? null,
        implantado: parsed.data.implantado,
        ativo: parsed.data.ativo,
      },
    });

    await registerAudit({
      entidade: "Modulo",
      entidadeId: modulo.id,
      acao: "CRIACAO",
      valorNovo: modulo,
      usuarioId: session.id,
    });

    return NextResponse.json(modulo);
  } catch (e) {
    console.error("Create modulo error:", e);
    return NextResponse.json(
      { message: "Erro ao criar módulo" },
      { status: 500 }
    );
  }
}
