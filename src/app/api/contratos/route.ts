import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { contratoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";
import { calcularValorMensalReferencia } from "@/lib/finance";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { modulos: true, itens: true } } },
  });
  return NextResponse.json(contratos);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = contratoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const valorMensal =
      parsed.data.valorMensalReferencia ??
      calcularValorMensalReferencia(parsed.data.valorAnual);

    const contrato = await prisma.contrato.create({
      data: {
        nome: parsed.data.nome,
        numeroContrato: parsed.data.numeroContrato,
        fornecedor: parsed.data.fornecedor,
        objeto: parsed.data.objeto ?? null,
        vigenciaInicio: parsed.data.vigenciaInicio,
        vigenciaFim: parsed.data.vigenciaFim,
        valorAnual: parsed.data.valorAnual,
        valorMensalReferencia: valorMensal,
        status: parsed.data.status,
        gestorContrato: parsed.data.gestorContrato ?? null,
        observacoesGerais: parsed.data.observacoesGerais ?? null,
        formaCalculoMedicao: parsed.data.formaCalculoMedicao,
      },
    });

    await registerAudit({
      entidade: "Contrato",
      entidadeId: contrato.id,
      acao: "CRIACAO",
      valorNovo: contrato,
      usuarioId: session.id,
    });

    return NextResponse.json(contrato);
  } catch (e) {
    console.error("Create contrato error:", e);
    return NextResponse.json(
      { message: "Erro ao criar contrato" },
      { status: 500 }
    );
  }
}
