import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { metaSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = metaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const meta = await prisma.metaPlanejamento.update({
    where: { id },
    data: {
      ...(parsed.data.ano !== undefined ? { ano: parsed.data.ano } : {}),
      ...(parsed.data.titulo !== undefined ? { titulo: parsed.data.titulo } : {}),
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao ?? null } : {}),
      ...(parsed.data.contextoOrigem !== undefined ? { contextoOrigem: parsed.data.contextoOrigem ?? null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.prazo !== undefined ? { prazo: parsed.data.prazo ?? null } : {}),
    },
  });

  return NextResponse.json(meta);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.metaPlanejamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
