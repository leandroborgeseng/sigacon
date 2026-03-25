import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { pingGlpiApiEndpoint } from "@/lib/glpi-test-connection";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { baseUrl?: string };
  const baseUrl = body.baseUrl?.trim() ?? "";
  if (!baseUrl) {
    return NextResponse.json({ ok: false, detail: "Informe a URL." }, { status: 400 });
  }

  const r = await pingGlpiApiEndpoint(baseUrl);
  return NextResponse.json(r);
}
