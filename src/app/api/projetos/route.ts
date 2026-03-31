import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusProjeto } from "@prisma/client";
import { projetoSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "visualizar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const projetos = await prisma.projeto.findMany({
    orderBy: [{ status: "asc" }, { fimPrevisto: "asc" }, { criadoEm: "asc" }],
    include: {
      tarefas: {
        orderBy: [{ status: "asc" }, { prazo: "asc" }, { criadoEm: "asc" }],
        include: {
          glpiChamado: {
            select: { id: true, glpiTicketId: true, titulo: true, colunaKanban: true, statusLabel: true },
          },
        },
      },
    },
  });

  return NextResponse.json(projetos);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão para editar" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = projetoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const projeto = await prisma.projeto.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      status: parsed.data.status ?? StatusProjeto.NAO_INICIADO,
      inicioPrevisto: parsed.data.inicioPrevisto ?? null,
      fimPrevisto: parsed.data.fimPrevisto ?? null,
    },
  });

  return NextResponse.json(projeto);
}
