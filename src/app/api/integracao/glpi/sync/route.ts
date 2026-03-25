import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import { sincronizarChamadosGlpi, sincronizarChamadosGlpiAutomatico } from "@/server/services/glpi-sync";

/**
 * POST: busca tickets no GLPI e atualiza o cache local.
 * Com contrato: grupos técnicos vinculados (OR); senão grupos, fornecedor no título.
 * Sem contrato: termoTitulo no título.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    contratoId?: string;
    termoTitulo?: string;
    automatico?: boolean;
    maxRetries?: number;
    incremental?: boolean;
  };
  const autoHeader = request.headers.get("x-glpi-sync-secret")?.trim();
  const autoSecret = process.env.GLPI_SYNC_SECRET?.trim();
  const isAuto = body.automatico === true || (autoSecret && autoHeader === autoSecret);

  if (!isAuto) {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const pode = await canRecurso(
      session.perfil as PerfilUsuario,
      RecursoPermissao.CUSTOMIZACAO,
      "visualizar"
    );
    if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  } else if (!autoSecret || autoHeader !== autoSecret) {
    return NextResponse.json({ message: "Sync automático não autorizado (segredo inválido)." }, { status: 401 });
  }

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json(
      { message: "Configure o GLPI em Configuração GLPI ou GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN" },
      { status: 503 }
    );
  }

  try {
    const result = isAuto
      ? await sincronizarChamadosGlpiAutomatico({
          contratoId: body.contratoId,
          maxRetries: body.maxRetries,
          incremental: body.incremental ?? true,
        })
      : await sincronizarChamadosGlpi({
          contratoId: body.contratoId,
          termoTitulo: body.termoTitulo,
        });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro na sincronização" },
      { status: 500 }
    );
  }
}
