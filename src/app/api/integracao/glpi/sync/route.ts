import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { glpiEstaConfigurado } from "@/lib/glpi-client";
import { sincronizarChamadosGlpi } from "@/server/services/glpi-sync";

/**
 * POST: busca tickets no GLPI (título contém fornecedor) e atualiza o cache local.
 * Body JSON: { contratoId?: string, termoTitulo?: string }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  if (!glpiEstaConfigurado()) {
    return NextResponse.json(
      { message: "Configure GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      contratoId?: string;
      termoTitulo?: string;
    };
    const result = await sincronizarChamadosGlpi({
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
