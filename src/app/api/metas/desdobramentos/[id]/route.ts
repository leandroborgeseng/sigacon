import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusMeta } from "@prisma/client";
import { desdobramentoSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = desdobramentoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.metaDesdobramento.update({
    where: { id },
    data: {
      ...(parsed.data.titulo !== undefined ? { titulo: parsed.data.titulo } : {}),
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao ?? null } : {}),
      ...(parsed.data.responsavel !== undefined ? { responsavel: parsed.data.responsavel ?? null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.percentualConcluido !== undefined ? { percentualConcluido: parsed.data.percentualConcluido } : {}),
      ...(parsed.data.prazoInicio !== undefined ? { prazoInicio: parsed.data.prazoInicio ?? null } : {}),
      ...(parsed.data.prazoFim !== undefined ? { prazoFim: parsed.data.prazoFim ?? null } : {}),
    },
  });

  if (parsed.data.glpiChamadoIds !== undefined) {
    await prisma.metaDesdobramentoGlpiChamado.deleteMany({ where: { desdobramentoId: id } });
    if (parsed.data.glpiChamadoIds.length > 0) {
      await prisma.metaDesdobramentoGlpiChamado.createMany({
        data: parsed.data.glpiChamadoIds.map((glpiChamadoId) => ({ desdobramentoId: id, glpiChamadoId })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.metaDesdobramento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
