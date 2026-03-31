import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusMeta } from "@prisma/client";
import { metaSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const ano = Number(searchParams.get("ano") || "2026");

  const metas = await prisma.metaPlanejamento.findMany({
    where: { ano },
    orderBy: [{ status: "asc" }, { prazo: "asc" }, { criadoEm: "asc" }],
    include: {
      desdobramentos: {
        orderBy: [{ status: "asc" }, { prazoFim: "asc" }, { criadoEm: "asc" }],
        include: {
          chamados: {
            include: {
              glpiChamado: {
                select: {
                  id: true,
                  glpiTicketId: true,
                  titulo: true,
                  colunaKanban: true,
                  statusLabel: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const glpiChamados = await prisma.glpiChamado.findMany({
    orderBy: [{ dataModificacao: "desc" }, { glpiTicketId: "desc" }],
    take: 500,
    select: {
      id: true,
      glpiTicketId: true,
      titulo: true,
      colunaKanban: true,
      statusLabel: true,
      dataModificacao: true,
    },
  });

  return NextResponse.json({ metas, glpiChamados });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão para editar metas" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = metaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const meta = await prisma.metaPlanejamento.create({
    data: {
      ano: parsed.data.ano,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      contextoOrigem: parsed.data.contextoOrigem ?? null,
      status: parsed.data.status ?? StatusMeta.NAO_INICIADA,
      prazo: parsed.data.prazo ?? null,
    },
  });
  return NextResponse.json(meta);
}
