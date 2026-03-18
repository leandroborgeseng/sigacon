import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { marcoImplantacaoSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, mid } = await params;
  const existing = await prisma.marcoImplantacao.findFirst({ where: { id: mid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = marcoImplantacaoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.marcoImplantacao.update({
    where: { id: mid },
    data: {
      ...(parsed.data.titulo != null && { titulo: parsed.data.titulo.trim() }),
      ...(parsed.data.descricao !== undefined && { descricao: parsed.data.descricao }),
      ...(parsed.data.dataPrevista != null && { dataPrevista: parsed.data.dataPrevista }),
      ...(parsed.data.dataRealizada !== undefined && { dataRealizada: parsed.data.dataRealizada }),
      ...(parsed.data.status != null && { status: parsed.data.status }),
      ...(parsed.data.ordem != null && { ordem: parsed.data.ordem }),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, mid } = await params;
  const existing = await prisma.marcoImplantacao.findFirst({ where: { id: mid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  await prisma.marcoImplantacao.delete({ where: { id: mid } });
  return NextResponse.json({ ok: true });
}
