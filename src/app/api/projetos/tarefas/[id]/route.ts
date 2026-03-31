import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { projetoTarefaSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = projetoTarefaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.responsavelGlpiId && parsed.data.responsavelGlpiNome === undefined) {
    return NextResponse.json({ message: "Informe o nome do usuário GLPI responsável" }, { status: 400 });
  }

  const tarefa = await prisma.projetoTarefa.update({
    where: { id },
    data: {
      ...(parsed.data.projetoId !== undefined ? { projetoId: parsed.data.projetoId } : {}),
      ...(parsed.data.titulo !== undefined ? { titulo: parsed.data.titulo } : {}),
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao ?? null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.responsavel !== undefined ? { responsavel: parsed.data.responsavel ?? null } : {}),
      ...(parsed.data.responsavelGlpiId !== undefined
        ? { responsavelGlpiId: parsed.data.responsavelGlpiId ?? null }
        : {}),
      ...(parsed.data.responsavelGlpiNome !== undefined
        ? { responsavelGlpiNome: parsed.data.responsavelGlpiNome ?? null }
        : {}),
      ...(parsed.data.prazo !== undefined ? { prazo: parsed.data.prazo ?? null } : {}),
      ...(parsed.data.glpiChamadoId !== undefined ? { glpiChamadoId: parsed.data.glpiChamadoId || null } : {}),
    },
  });

  return NextResponse.json(tarefa);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  await prisma.projetoTarefa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
