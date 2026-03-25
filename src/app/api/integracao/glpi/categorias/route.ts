import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { glpiEstaConfigurado } from "@/lib/glpi-config";
import { glpiListItilCategories, glpiWithSession } from "@/lib/glpi-client";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  if (!(await glpiEstaConfigurado())) {
    return NextResponse.json(
      { message: "Configure o GLPI em Configuração GLPI ou variáveis de ambiente", categorias: [] },
      { status: 503 }
    );
  }

  try {
    const categorias = await glpiWithSession((ctx) => glpiListItilCategories(ctx));
    return NextResponse.json({ categorias });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erro ao listar categorias GLPI", categorias: [] },
      { status: 502 }
    );
  }
}

