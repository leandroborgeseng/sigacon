import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ataReuniaoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const ata = await prisma.ataReuniao.findUnique({
    where: { id },
    include: { contrato: true, anexos: true },
  });
  if (!ata) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });
  return NextResponse.json(ata);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ataReuniao.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = ataReuniaoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ata = await prisma.ataReuniao.update({
      where: { id },
      data: {
        ...parsed.data,
        medicaoMensalId: parsed.data.medicaoMensalId ?? undefined,
      },
    });

    await registerAudit({
      entidade: "AtaReuniao",
      entidadeId: id,
      acao: "ATUALIZACAO",
      valorAnterior: existing,
      valorNovo: ata,
      usuarioId: session.id,
    });

    return NextResponse.json(ata);
  } catch (e) {
    console.error("Update ata error:", e);
    return NextResponse.json(
      { message: "Erro ao atualizar ata" },
      { status: 500 }
    );
  }
}
