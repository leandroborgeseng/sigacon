import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import { glpiListAssignableGroups, glpiWithSession } from "@/lib/glpi-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const podeCust = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  const podeContr = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CONTRATOS,
    "editar"
  );
  if (!podeCust && !podeContr) {
    return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  }

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json(
      { message: "Configure o GLPI em Configuração GLPI ou variáveis de ambiente", grupos: [] },
      { status: 503 }
    );
  }

  try {
    const grupos = await glpiWithSession((ctx) => glpiListAssignableGroups(ctx));
    return NextResponse.json({ grupos });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro ao listar grupos GLPI", grupos: [] },
      { status: 502 }
    );
  }
}
