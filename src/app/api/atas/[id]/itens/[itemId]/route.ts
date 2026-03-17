import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: ataId, itemId: itemContratualId } = await params;
  const ata = await prisma.ataReuniao.findUnique({ where: { id: ataId }, select: { id: true } });
  if (!ata) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });

  const deleted = await prisma.itensAta.deleteMany({
    where: { ataReuniaoId: ataId, itemContratualId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ message: "Vínculo não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
