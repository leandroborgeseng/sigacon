import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { moverChamadoKanbanEGlpi } from "@/server/services/glpi-sync";
import { PerfilUsuario, RecursoPermissao, type GlpiKanbanColuna } from "@prisma/client";

async function checkPermissao() {
  const session = await getSession();
  if (!session) return { ok: false as const, status: 401, message: "Não autorizado" };
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return { ok: false as const, status: 403, message: "Sem permissão" };
  return { ok: true as const };
}

export async function GET(request: Request) {
  const perm = await checkPermissao();
  if (!perm.ok) return NextResponse.json({ message: perm.message }, { status: perm.status });

  const { searchParams } = new URL(request.url);
  const contratoId = searchParams.get("contratoId")?.trim() || undefined;
  const fornecedor = searchParams.get("fornecedor")?.trim() || undefined;
  const termo = searchParams.get("termo")?.trim() || undefined;

  const chamados = await prisma.glpiChamado.findMany({
    where: {
      ...(contratoId ? { contratoId } : {}),
      ...(fornecedor ? { fornecedorNome: { contains: fornecedor, mode: "insensitive" } } : {}),
      ...(termo
        ? {
            OR: [
              { titulo: { contains: termo, mode: "insensitive" } },
              { conteudoPreview: { contains: termo, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ colunaKanban: "asc" }, { dataModificacao: "desc" }, { glpiTicketId: "desc" }],
    include: { contrato: { select: { id: true, nome: true } } },
    take: 1000,
  });

  return NextResponse.json(chamados);
}

export async function PATCH(request: Request) {
  const perm = await checkPermissao();
  if (!perm.ok) return NextResponse.json({ message: perm.message }, { status: perm.status });

  const body = (await request.json().catch(() => ({}))) as {
    glpiTicketId?: number;
    colunaKanban?: GlpiKanbanColuna;
  };
  if (!body.glpiTicketId || !body.colunaKanban) {
    return NextResponse.json(
      { message: "Informe glpiTicketId e colunaKanban" },
      { status: 400 }
    );
  }

  try {
    await moverChamadoKanbanEGlpi(body.glpiTicketId, body.colunaKanban);
    const atualizado = await prisma.glpiChamado.findUnique({
      where: { glpiTicketId: body.glpiTicketId },
    });
    return NextResponse.json(atualizado);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro ao mover chamado" },
      { status: 502 }
    );
  }
}
