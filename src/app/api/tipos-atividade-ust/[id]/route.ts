import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { PerfilUsuario } from "@prisma/client";
import { tipoAtividadeUstSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil as PerfilUsuario)) {
    return NextResponse.json({ message: "Somente administrador" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.tipoAtividadeUst.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = tipoAtividadeUstSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.tipoAtividadeUst.update({
    where: { id },
    data: {
      ...(parsed.data.nome != null && { nome: parsed.data.nome }),
      ...(parsed.data.categoria != null && { categoria: parsed.data.categoria }),
      ...(parsed.data.complexidade !== undefined && { complexidade: parsed.data.complexidade }),
      ...(parsed.data.ustFixo != null && { ustFixo: parsed.data.ustFixo }),
      ...(parsed.data.ativo != null && { ativo: parsed.data.ativo }),
      ...(parsed.data.ordem != null && { ordem: parsed.data.ordem }),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil as PerfilUsuario)) {
    return NextResponse.json({ message: "Somente administrador" }, { status: 403 });
  }
  const { id } = await params;
  const t = await prisma.tipoAtividadeUst.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  if (t.codigo) {
    return NextResponse.json({ message: "Tipo padrão: desative em vez de excluir" }, { status: 400 });
  }
  const n = await prisma.lancamentoUst.count({ where: { tipoAtividadeUstId: id } });
  if (n > 0) return NextResponse.json({ message: "Existem lançamentos vinculados" }, { status: 400 });
  await prisma.tipoAtividadeUst.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
