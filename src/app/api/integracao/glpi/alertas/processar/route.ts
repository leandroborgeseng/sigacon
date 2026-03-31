import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { processarAlertasGlpiChamados } from "@/server/services/glpi-alertas";

export async function POST(request: Request) {
  const autoHeader = request.headers.get("x-glpi-sync-secret")?.trim();
  const autoSecret = process.env.GLPI_SYNC_SECRET?.trim();
  const isAuto = Boolean(autoSecret && autoHeader === autoSecret);

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
    return NextResponse.json({ message: "Processamento automático não autorizado." }, { status: 401 });
  }

  try {
    const result = await processarAlertasGlpiChamados();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro ao processar alertas GLPI" },
      { status: 500 }
    );
  }
}
