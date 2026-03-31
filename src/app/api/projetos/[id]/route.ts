import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { projetoSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = projetoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const projeto = await prisma.projeto.update({
    where: { id },
    data: {
      ...(parsed.data.nome !== undefined ? { nome: parsed.data.nome } : {}),
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao ?? null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.inicioPrevisto !== undefined ? { inicioPrevisto: parsed.data.inicioPrevisto ?? null } : {}),
      ...(parsed.data.fimPrevisto !== undefined ? { fimPrevisto: parsed.data.fimPrevisto ?? null } : {}),
    },
  });

  return NextResponse.json(projeto);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.projeto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
