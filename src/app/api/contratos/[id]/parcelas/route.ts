import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao, StatusParcelaPagamento } from "@prisma/client";
import { parcelaPagamentoSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const rows = await prisma.parcelaPagamento.findMany({
    where: { contratoId },
    orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const c = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = parcelaPagamentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  let status = parsed.data.status ?? StatusParcelaPagamento.PREVISTO;
  const vp = parsed.data.valorPago;
  if (vp != null && vp > 0) {
    if (parsed.data.valorPrevisto > 0 && vp >= Number(parsed.data.valorPrevisto)) status = StatusParcelaPagamento.PAGO;
    else status = StatusParcelaPagamento.PARCIAL;
  }
  try {
    const row = await prisma.parcelaPagamento.create({
      data: {
        contratoId,
        competenciaAno: parsed.data.competenciaAno,
        competenciaMes: parsed.data.competenciaMes,
        descricao: parsed.data.descricao ?? null,
        valorPrevisto: parsed.data.valorPrevisto,
        valorPago: parsed.data.valorPago ?? null,
        dataVencimento: parsed.data.dataVencimento ?? null,
        dataPagamento: parsed.data.dataPagamento ?? null,
        numeroNf: parsed.data.numeroNf ?? null,
        status,
        observacao: parsed.data.observacao ?? null,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { message: "Já existe parcela para esta competência (ano/mês)" },
      { status: 409 }
    );
  }
}
