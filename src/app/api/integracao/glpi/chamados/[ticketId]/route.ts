import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import {
  glpiGetTicket,
  glpiListTicketDocuments,
  glpiListTicketFollowups,
  glpiListTicketSolutions,
  glpiListTicketTasks,
  glpiWithSession,
} from "@/lib/glpi-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

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
      return { ticket, followups, tasks, solutions, documents };
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Erro ao buscar detalhes do chamado" },
      { status: 502 }
    );
  }
}

