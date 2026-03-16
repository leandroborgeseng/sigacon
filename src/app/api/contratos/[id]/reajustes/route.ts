import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { reajusteContratoSchema } from "@/lib/validators/contrato";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: contratoId } = await params;
  const exists = await prisma.contrato.findUnique({ where: { id: contratoId }, select: { id: true } });
  if (!exists) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  const reajustes = await prisma.reajusteContrato.findMany({
    where: { contratoId },
    orderBy: { dataReajuste: "desc" },
  });
  return NextResponse.json(reajustes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: contratoId } = await params;
  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!contrato) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = reajusteContratoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reajuste = await prisma.reajusteContrato.create({
      data: {
        contratoId,
        dataReajuste: parsed.data.dataReajuste,
        valorAnterior: parsed.data.valorAnterior,
        valorNovo: parsed.data.valorNovo,
        percentualAplicado: parsed.data.percentualAplicado,
        indiceReferencia: parsed.data.indiceReferencia ?? undefined,
        observacao: parsed.data.observacao ?? undefined,
      },
    });
    return NextResponse.json(reajuste);
  } catch (e) {
    console.error("Create reajuste error:", e);
    return NextResponse.json(
      { message: "Erro ao registrar reajuste" },
      { status: 500 }
    );
  }
}
