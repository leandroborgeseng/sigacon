import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import {
  glpiUpdateTicket,
  glpiGetTicket,
  glpiListTicketDocuments,
  glpiListTicketFollowups,
  glpiListTicketSolutions,
  glpiListTicketTasks,
  glpiWithSession,
} from "@/lib/glpi-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { statusGlpiParaColuna } from "@/lib/glpi-kanban-map";

function asPlainObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export async function GET(request: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json({ message: "GLPI não configurado" }, { status: 503 });
  }

  const { ticketId } = await ctx.params;
  const idNum = /^\d+$/.test(ticketId) ? parseInt(ticketId, 10) : NaN;
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ message: "ticketId inválido" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const incluirPropsDebug =
    searchParams.get("debug") === "1" || searchParams.get("ticketProperties") === "1";

  try {
    const cacheLocal = await prisma.glpiChamado.findUnique({
      where: { glpiTicketId: idNum },
      select: {
        glpiTicketId: true,
        titulo: true,
        conteudoPreview: true,
        statusGlpi: true,
        prioridade: true,
        urgencia: true,
        categoriaIdGlpi: true,
        categoriaNome: true,
        grupoTecnicoIdGlpi: true,
        grupoTecnicoNome: true,
        tecnicoResponsavelIdGlpi: true,
        tecnicoResponsavelNome: true,
        dataAbertura: true,
        dataModificacao: true,
      },
    });

    const data = await glpiWithSession(async (s) => {
      const avisos: string[] = [];

      const ticket = await glpiGetTicket(s, idNum).catch(() => {
        if (!cacheLocal) return null;
        avisos.push("Ticket carregado do cache local (consulta direta indisponível).");
        return {
          id: cacheLocal.glpiTicketId,
          name: cacheLocal.titulo,
          content: cacheLocal.conteudoPreview,
          status: cacheLocal.statusGlpi,
          priority: cacheLocal.prioridade,
          urgency: cacheLocal.urgencia,
          itilcategories_id: cacheLocal.categoriaIdGlpi,
          _itilcategories_id: cacheLocal.categoriaNome,
          groups_id_assign: cacheLocal.grupoTecnicoIdGlpi,
          _groups_id_assign: cacheLocal.grupoTecnicoNome,
          users_id_assign: cacheLocal.tecnicoResponsavelIdGlpi,
          _users_id_assign: cacheLocal.tecnicoResponsavelNome,
          date: cacheLocal.dataAbertura?.toISOString(),
          date_mod: cacheLocal.dataModificacao?.toISOString(),
        };
      });
      if (!ticket) {
        throw new Error("Não foi possível carregar o ticket no sistema de chamados.");
      }

      const [followupsR, tasksR, solutionsR, documentsR] = await Promise.allSettled([
        glpiListTicketFollowups(s, idNum),
        glpiListTicketTasks(s, idNum),
        glpiListTicketSolutions(s, idNum),
        glpiListTicketDocuments(s, idNum),
      ]);
      const followups = followupsR.status === "fulfilled" ? followupsR.value : [];
      const tasks = tasksR.status === "fulfilled" ? tasksR.value : [];
      const solutions = solutionsR.status === "fulfilled" ? solutionsR.value : [];
      const documents = documentsR.status === "fulfilled" ? documentsR.value : [];

      if (followupsR.status === "rejected") avisos.push("Não foi possível carregar comentários.");
      if (tasksR.status === "rejected") avisos.push("Não foi possível carregar tarefas.");
      if (solutionsR.status === "rejected") avisos.push("Não foi possível carregar soluções.");
      if (documentsR.status === "rejected") avisos.push("Não foi possível carregar documentos.");

      const raw = asPlainObject(ticket);
      const base = {
        ticket,
        ticketRaw: raw,
        followups,
        tasks,
        solutions,
        documents,
        avisos,
      };
      if (!incluirPropsDebug) return base;
      function prettyKey(k: string): string {
        return k.replace(/^_+/, "").replace(/_/g, " ");
      }
      const ticketProperties = Object.keys(raw)
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((k) => {
          const v = raw[k];
          const value =
            v == null
              ? ""
              : typeof v === "string"
                ? v
                : typeof v === "number" || typeof v === "boolean"
                  ? String(v)
                  : JSON.stringify(v);
          return { key: prettyKey(k), rawKey: k, value };
        });
      return { ...base, ticketProperties };
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Erro ao buscar detalhes do chamado" },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "editar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json({ message: "GLPI não configurado" }, { status: 503 });
  }

  const { ticketId } = await ctx.params;
  const idNum = /^\d+$/.test(ticketId) ? parseInt(ticketId, 10) : NaN;
  if (!Number.isFinite(idNum)) return NextResponse.json({ message: "ticketId inválido" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    content?: string;
    status?: number;
    priority?: number;
    urgency?: number;
    itilcategories_id?: number;
    groups_id_assign?: number;
    users_id_assign?: number;
  };

  const input: {
    name?: string;
    content?: string;
    status?: number;
    priority?: number;
    urgency?: number;
    itilcategories_id?: number;
    groups_id_assign?: number;
    users_id_assign?: number;
  } = {};
  if (typeof body.name === "string") input.name = body.name.trim();
  if (typeof body.content === "string") input.content = body.content;
  if (typeof body.status === "number") input.status = body.status;
  if (typeof body.priority === "number") input.priority = body.priority;
  if (typeof body.urgency === "number") input.urgency = body.urgency;
  if (typeof body.itilcategories_id === "number") input.itilcategories_id = body.itilcategories_id;
  if (typeof body.groups_id_assign === "number") input.groups_id_assign = body.groups_id_assign;
  if (typeof body.users_id_assign === "number") input.users_id_assign = body.users_id_assign;

  if (Object.keys(input).length === 0) {
    return NextResponse.json({ message: "Nenhuma alteração enviada." }, { status: 400 });
  }

  try {
    await glpiWithSession(async (s) => {
      await glpiUpdateTicket(s, idNum, input);
    });

    // Atualiza cache local com o mínimo necessário para refletir no Kanban.
    const status = typeof input.status === "number" ? input.status : null;
    const coluna = status != null ? statusGlpiParaColuna(status) : null;
    await prisma.glpiChamado
      .update({
        where: { glpiTicketId: idNum },
        data: {
          ...(typeof input.name === "string" ? { titulo: input.name.trim() || `#${idNum}` } : {}),
          ...(typeof input.content === "string" ? { conteudoPreview: input.content.slice(0, 500) } : {}),
          ...(typeof input.priority === "number" ? { prioridade: input.priority } : {}),
          ...(typeof input.urgency === "number" ? { urgencia: input.urgency } : {}),
          ...(typeof input.itilcategories_id === "number" ? { categoriaIdGlpi: input.itilcategories_id } : {}),
          ...(typeof input.groups_id_assign === "number" ? { grupoTecnicoIdGlpi: input.groups_id_assign } : {}),
          ...(typeof input.users_id_assign === "number"
            ? { tecnicoResponsavelIdGlpi: input.users_id_assign }
            : {}),
          ...(status != null ? { statusGlpi: status } : {}),
          ...(coluna != null ? { colunaKanban: coluna } : {}),
          ultimoPushEm: new Date(),
          syncStatus: "OK",
          syncErro: null,
        },
      })
      .catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Erro ao atualizar ticket no GLPI" },
      { status: 502 }
    );
  }
}

