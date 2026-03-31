import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusMeta } from "@prisma/client";
import { desdobramentoSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = desdobramentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const row = await prisma.metaDesdobramento.create({
    data: {
      metaId: parsed.data.metaId,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      responsavel: parsed.data.responsavel ?? null,
      status: parsed.data.status ?? StatusMeta.NAO_INICIADA,
      percentualConcluido: parsed.data.percentualConcluido ?? 0,
      prazoInicio: parsed.data.prazoInicio ?? null,
      prazoFim: parsed.data.prazoFim ?? null,
    },
  });

  if (parsed.data.glpiChamadoIds.length > 0) {
    await prisma.metaDesdobramentoGlpiChamado.createMany({
      data: parsed.data.glpiChamadoIds.map((glpiChamadoId) => ({ desdobramentoId: row.id, glpiChamadoId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(row);
}
