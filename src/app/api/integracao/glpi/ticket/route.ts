import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

/**
 * Consulta básica ao GLPI (opcional).
 * Variáveis: GLPI_URL (ex. …/api.php/v1 ou …/apirest.php), GLPI_USER_TOKEN, GLPI_APP_TOKEN
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const base = process.env.GLPI_URL?.replace(/\/$/, "");
  const appToken = process.env.GLPI_APP_TOKEN;
  const userToken = process.env.GLPI_USER_TOKEN;
  const rawId = new URL(request.url).searchParams.get("id")?.trim();
  const ticketId = rawId && /^\d+$/.test(rawId) ? rawId : null;

  if (!base || !appToken || !userToken) {
    return NextResponse.json({
      configurado: false,
      message:
        "Defina GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN no ambiente para validar tickets automaticamente.",
    });
  }
  if (!ticketId) {
    return NextResponse.json(
      { message: "Parâmetro id obrigatório (apenas dígitos, ex.: id=12345)" },
      { status: 400 }
    );
  }

  try {
    const init = await fetch(`${base}/initSession`, {
      method: "GET",
      headers: {
        "App-Token": appToken,
        Authorization: `user_token ${userToken}`,
      },
    });
    if (!init.ok) {
      const t = await init.text();
      return NextResponse.json(
        { configurado: true, ok: false, message: "Falha ao iniciar sessão GLPI", detalhe: t.slice(0, 200) },
        { status: 502 }
      );
    }
    const { session_token: sessionToken } = (await init.json()) as { session_token?: string };
    if (!sessionToken) {
      return NextResponse.json({ configurado: true, ok: false, message: "Token de sessão GLPI vazio" }, { status: 502 });
    }
    const tick = await fetch(`${base}/Ticket/${encodeURIComponent(ticketId)}?expand_dropdowns=true`, {
      headers: {
        "App-Token": appToken,
        "Session-Token": sessionToken,
      },
    });
    await fetch(`${base}/killSession`, {
      method: "GET",
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    }).catch(() => {});

    if (!tick.ok) {
      return NextResponse.json(
        { configurado: true, ok: false, message: `Ticket ${ticketId} não encontrado ou sem acesso` },
        { status: 404 }
      );
    }
    const data = (await tick.json()) as { name?: string; status?: number; id?: number };
    return NextResponse.json({
      configurado: true,
      ok: true,
      ticketId: data.id ?? ticketId,
      titulo: data.name ?? "",
      status: data.status,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ configurado: true, ok: false, message: "Erro ao contatar GLPI" }, { status: 502 });
  }
}
