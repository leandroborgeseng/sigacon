import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { servicoCatalogoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, sid } = await params;
  const existing = await prisma.servicoCatalogo.findFirst({ where: { id: sid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = servicoCatalogoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.servicoCatalogo.update({
    where: { id: sid },
    data: {
      ...(parsed.data.nome != null && { nome: parsed.data.nome }),
      ...(parsed.data.descricao !== undefined && { descricao: parsed.data.descricao }),
      ...(parsed.data.unidadeMedicao != null && { unidadeMedicao: parsed.data.unidadeMedicao }),
      ...(parsed.data.valorUnitario != null && { valorUnitario: parsed.data.valorUnitario }),
      ...(parsed.data.slaTexto !== undefined && { slaTexto: parsed.data.slaTexto }),
      ...(parsed.data.formaComprovacao !== undefined && { formaComprovacao: parsed.data.formaComprovacao }),
      ...(parsed.data.ustReferencia !== undefined && { ustReferencia: parsed.data.ustReferencia }),
      ...(parsed.data.ativo != null && { ativo: parsed.data.ativo }),
      ...(parsed.data.ordem != null && { ordem: parsed.data.ordem }),
    },
  });
  await registerAudit({
    entidade: "ServicoCatalogo",
    entidadeId: sid,
    acao: "ATUALIZACAO",
    valorAnterior: existing,
    valorNovo: row,
    usuarioId: session.id,
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, sid } = await params;
  const existing = await prisma.servicoCatalogo.findFirst({ where: { id: sid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  await prisma.servicoCatalogo.delete({ where: { id: sid } });
  await registerAudit({
    entidade: "ServicoCatalogo",
    entidadeId: sid,
    acao: "EXCLUSAO",
    valorAnterior: existing,
    valorNovo: null,
    usuarioId: session.id,
  });
  return NextResponse.json({ ok: true });
}
