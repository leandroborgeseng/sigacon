import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import { glpiCreateTicketTask, glpiWithSession } from "@/lib/glpi-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function POST(request: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json({ message: "GLPI não configurado" }, { status: 503 });
  }

  const { ticketId } = await ctx.params;
  const idNum = /^\d+$/.test(ticketId) ? parseInt(ticketId, 10) : NaN;
  if (!Number.isFinite(idNum)) return NextResponse.json({ message: "ticketId inválido" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { content?: string; privado?: boolean };
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ message: "Informe o conteúdo da tarefa" }, { status: 400 });

  try {
    const result = await glpiWithSession((s) =>
      glpiCreateTicketTask(s, idNum, { content, privado: Boolean(body.privado) })
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Erro ao criar tarefa no GLPI" },
      { status: 502 }
    );
  }
}

