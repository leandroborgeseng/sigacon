import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusProjeto } from "@prisma/client";
import { projetoTarefaSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = projetoTarefaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.responsavelGlpiId && !parsed.data.responsavelGlpiNome) {
    return NextResponse.json({ message: "Informe o nome do usuário GLPI responsável" }, { status: 400 });
  }

  const tarefa = await prisma.projetoTarefa.create({
    data: {
      projetoId: parsed.data.projetoId,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      status: parsed.data.status ?? StatusProjeto.NAO_INICIADO,
      responsavel: parsed.data.responsavel ?? null,
      responsavelGlpiId: parsed.data.responsavelGlpiId ?? null,
      responsavelGlpiNome: parsed.data.responsavelGlpiNome ?? null,
      prazo: parsed.data.prazo ?? null,
      glpiChamadoId: parsed.data.glpiChamadoId || null,
    },
  });

  return NextResponse.json(tarefa);
}
