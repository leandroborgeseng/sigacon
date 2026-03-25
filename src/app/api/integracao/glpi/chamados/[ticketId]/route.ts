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

function prettyKey(k: string): string {
  return k.replace(/^_+/, "").replace(/_/g, " ");
}

export async function GET(_: Request, ctx: { params: Promise<{ ticketId: string }> }) {
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

  try {
    const data = await glpiWithSession(async (s) => {
      const ticket = await glpiGetTicket(s, idNum);
      const followups = await glpiListTicketFollowups(s, idNum);
      const tasks = await glpiListTicketTasks(s, idNum);
      const solutions = await glpiListTicketSolutions(s, idNum);
      const documents = await glpiListTicketDocuments(s, idNum);
      const raw = asPlainObject(ticket);
      const properties = Object.keys(raw)
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
      return { ticket, ticketRaw: raw, ticketProperties: properties, followups, tasks, solutions, documents };
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

