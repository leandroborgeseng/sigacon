import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao, StatusParcelaPagamento } from "@prisma/client";
import { parcelaPagamentoSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, pid } = await params;
  const existing = await prisma.parcelaPagamento.findFirst({ where: { id: pid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = parcelaPagamentoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const valorPrev = parsed.data.valorPrevisto ?? Number(existing.valorPrevisto);
  const valorPg = parsed.data.valorPago !== undefined ? parsed.data.valorPago : existing.valorPago;
  const vpNum = valorPg != null ? Number(valorPg) : 0;
  let status = parsed.data.status ?? existing.status;
  if (parsed.data.valorPago !== undefined || parsed.data.valorPrevisto != null) {
    if (vpNum <= 0) status = StatusParcelaPagamento.PREVISTO;
    else if (vpNum >= valorPrev) status = StatusParcelaPagamento.PAGO;
    else status = StatusParcelaPagamento.PARCIAL;
  }
  const row = await prisma.parcelaPagamento.update({
    where: { id: pid },
    data: {
      ...(parsed.data.descricao !== undefined && { descricao: parsed.data.descricao }),
      ...(parsed.data.valorPrevisto != null && { valorPrevisto: parsed.data.valorPrevisto }),
      ...(parsed.data.valorPago !== undefined && { valorPago: parsed.data.valorPago }),
      ...(parsed.data.dataVencimento !== undefined && { dataVencimento: parsed.data.dataVencimento }),
      ...(parsed.data.dataPagamento !== undefined && { dataPagamento: parsed.data.dataPagamento }),
      ...(parsed.data.numeroNf !== undefined && { numeroNf: parsed.data.numeroNf }),
      ...(parsed.data.observacao !== undefined && { observacao: parsed.data.observacao }),
      status,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, pid } = await params;
  const existing = await prisma.parcelaPagamento.findFirst({ where: { id: pid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  await prisma.parcelaPagamento.delete({ where: { id: pid } });
  return NextResponse.json({ ok: true });
}
