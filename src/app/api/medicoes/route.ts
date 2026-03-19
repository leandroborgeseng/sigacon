import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getOrCreateMedicao } from "@/server/services/medicao";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId");
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");

  if (contratoId) {
    const medicoes = await prisma.medicaoMensal.findMany({
      where: { contratoId },
      orderBy: [{ ano: "desc" }, { mes: "desc" }],
      include: { contrato: { select: { nome: true } } },
    });
    return NextResponse.json(medicoes);
  }

  const medicoes = await prisma.medicaoMensal.findMany({
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
    take: 100,
    include: { contrato: { select: { nome: true, id: true } } },
  });
  return NextResponse.json(medicoes);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.MEDICOES,
    "editar"
  );
  if (!pode) {
    return NextResponse.json({ message: "Sem permissão para gerar medição" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { contratoId, ano, mes } = body;
    if (!contratoId || !ano || !mes) {
      return NextResponse.json(
        { message: "contratoId, ano e mes são obrigatórios" },
        { status: 400 }
      );
    }
    const medicao = await getOrCreateMedicao(contratoId, Number(ano), Number(mes));
    return NextResponse.json(medicao);
  } catch (e) {
    console.error("Medicao error:", e);
    return NextResponse.json(
      { message: "Erro ao gerar medição" },
      { status: 500 }
    );
  }
}
