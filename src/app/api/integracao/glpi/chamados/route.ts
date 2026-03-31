import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { atualizarChamadoGlpi } from "@/server/services/glpi-sync";
import { PerfilUsuario, RecursoPermissao, type GlpiKanbanColuna } from "@prisma/client";

function colunaKanbanPorStatusProjeto(status: "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "BLOQUEADO"): GlpiKanbanColuna {
  if (status === "EM_ANDAMENTO") return "EM_ANDAMENTO";
  if (status === "BLOQUEADO") return "AGUARDANDO";
  if (status === "CONCLUIDO") return "FECHADO";
  return "BACKLOG";
}

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
  const comMetasParam = searchParams.get("comMetas")?.trim();
  const metaId = searchParams.get("metaId")?.trim() || undefined;
  const filtroComMetas =
    comMetasParam === "1" ? true : comMetasParam === "0" ? false : undefined;
  let filtroGruposContrato: number[] | null = null;

  if (contratoId) {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: { glpiGruposTecnicos: { select: { glpiGroupId: true } } },
    });
    if (!contrato) {
      return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
    }
    const ids = contrato.glpiGruposTecnicos.map((g) => g.glpiGroupId);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }
    filtroGruposContrato = ids;
  }

  const [chamados, tarefasProjeto] = await Promise.all([
    prisma.glpiChamado.findMany({
      where: {
        ...(filtroGruposContrato
          ? {
              grupoTecnicoIdGlpi: { in: filtroGruposContrato },
            }
          : {}),
        ...(filtroComMetas === true
          ? { desdobramentosMeta: { some: {} } }
          : filtroComMetas === false
            ? { desdobramentosMeta: { none: {} } }
            : {}),
        ...(metaId
          ? { desdobramentosMeta: { some: { desdobramento: { metaId } } } }
          : {}),
      },
      orderBy: [{ colunaKanban: "asc" }, { dataModificacao: "desc" }, { glpiTicketId: "desc" }],
      include: {
        contrato: { select: { id: true, nome: true } },
        desdobramentosMeta: {
          select: {
            id: true,
            desdobramento: {
              select: {
                id: true,
                titulo: true,
                meta: { select: { id: true, titulo: true } },
              },
            },
          },
        },
      },
      take: 1000,
    }),
    prisma.projetoTarefa.findMany({
      where: {
        ...(contratoId
          ? {
              OR: [
                { glpiChamado: { is: { grupoTecnicoIdGlpi: { in: filtroGruposContrato ?? [] } } } },
                { glpiChamadoId: null },
              ],
            }
          : {}),
      },
      orderBy: [{ status: "asc" }, { prazo: "asc" }, { criadoEm: "asc" }],
      select: {
        id: true,
        titulo: true,
        descricao: true,
        status: true,
        responsavel: true,
        prazo: true,
        glpiChamadoId: true,
        glpiChamado: {
          select: {
            id: true,
            glpiTicketId: true,
            titulo: true,
          },
        },
        projeto: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      take: 2000,
    }),
  ]);
  return NextResponse.json({
    chamados,
    tarefasProjeto: tarefasProjeto.map((t) => ({
      ...t,
      colunaKanban: colunaKanbanPorStatusProjeto(t.status),
    })),
  });
}

export async function PATCH(request: Request) {
  const perm = await checkPermissao();
  if (!perm.ok) return NextResponse.json({ message: perm.message }, { status: perm.status });

  const body = (await request.json().catch(() => ({}))) as {
    glpiTicketId?: number;
    colunaKanban?: GlpiKanbanColuna;
    prioridade?: number;
    urgencia?: number;
    categoriaIdGlpi?: number;
    grupoTecnicoIdGlpi?: number;
    tecnicoResponsavelIdGlpi?: number;
  };
  if (!body.glpiTicketId) {
    return NextResponse.json(
      { message: "Informe glpiTicketId" },
      { status: 400 }
    );
  }
  if (
    !body.colunaKanban &&
    typeof body.prioridade !== "number" &&
    typeof body.urgencia !== "number" &&
    typeof body.categoriaIdGlpi !== "number" &&
    typeof body.grupoTecnicoIdGlpi !== "number" &&
    typeof body.tecnicoResponsavelIdGlpi !== "number"
  ) {
    return NextResponse.json(
      { message: "Informe ao menos um campo para atualizar (coluna/prioridade/urgência/categoria/grupo/técnico)." },
      { status: 400 }
    );
  }

  try {
    await atualizarChamadoGlpi(body.glpiTicketId, {
      colunaKanban: body.colunaKanban,
      prioridade: body.prioridade,
      urgencia: body.urgencia,
      categoriaIdGlpi: body.categoriaIdGlpi,
      grupoTecnicoIdGlpi: body.grupoTecnicoIdGlpi,
      tecnicoResponsavelIdGlpi: body.tecnicoResponsavelIdGlpi,
    });
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
