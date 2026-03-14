import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ataReuniaoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");

  const where = contratoId ? { contratoId } : {};
  const atas = await prisma.ataReuniao.findMany({
    where,
    orderBy: { dataReuniao: "desc" },
    include: { contrato: { select: { nome: true } } },
  });
  return NextResponse.json(atas);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = ataReuniaoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ata = await prisma.ataReuniao.create({
      data: {
        contratoId: parsed.data.contratoId,
        medicaoMensalId: parsed.data.medicaoMensalId ?? null,
        titulo: parsed.data.titulo,
        dataReuniao: parsed.data.dataReuniao,
        local: parsed.data.local ?? null,
        participantes: parsed.data.participantes ?? null,
        resumo: parsed.data.resumo ?? null,
        deliberacoes: parsed.data.deliberacoes ?? null,
        criadoPorUsuarioId: session.id,
      },
    });

    await registerAudit({
      entidade: "AtaReuniao",
      entidadeId: ata.id,
      acao: "CRIACAO",
      valorNovo: ata,
      usuarioId: session.id,
    });

    return NextResponse.json(ata);
  } catch (e) {
    console.error("Create ata error:", e);
    return NextResponse.json(
      { message: "Erro ao criar ata" },
      { status: 500 }
    );
  }
}
