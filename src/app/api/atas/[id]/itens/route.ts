import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: ataId } = await params;
  const ata = await prisma.ataReuniao.findUnique({
    where: { id: ataId },
    select: { id: true, contratoId: true },
  });
  if (!ata) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });

  const itens = await prisma.itensAta.findMany({
    where: { ataReuniaoId: ataId },
    include: {
      itemContratual: {
        include: { modulo: { select: { nome: true } } },
      },
    },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json(itens);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: ataId } = await params;
  const ata = await prisma.ataReuniao.findUnique({
    where: { id: ataId },
    select: { id: true, contratoId: true },
  });
  if (!ata) return NextResponse.json({ message: "Ata não encontrada" }, { status: 404 });

  try {
    const body = await request.json();
    const itemContratualId = typeof body.itemContratualId === "string" ? body.itemContratualId : body.itemId;
    if (!itemContratualId) {
      return NextResponse.json(
        { message: "itemContratualId é obrigatório" },
        { status: 400 }
      );
    }

    const item = await prisma.itemContratual.findUnique({
      where: { id: itemContratualId },
      select: { id: true, contratoId: true },
    });
    if (!item) return NextResponse.json({ message: "Item não encontrado" }, { status: 404 });
    if (item.contratoId !== ata.contratoId) {
      return NextResponse.json(
        { message: "O item deve pertencer ao contrato desta ata" },
        { status: 400 }
      );
    }

    const vinculado = await prisma.itensAta.create({
      data: { ataReuniaoId: ataId, itemContratualId: item.id },
      include: {
        itemContratual: { include: { modulo: { select: { nome: true } } } },
      },
    });
    return NextResponse.json(vinculado);
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && e.code === "P2002"
      ? "Este item já está vinculado à ata"
      : "Erro ao vincular item";
    console.error("Ata vincular item error:", e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
