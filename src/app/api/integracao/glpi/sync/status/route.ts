import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { obterStatusSyncUsuariosGlpi } from "@/server/services/glpi-users-sync";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const usuarios = await obterStatusSyncUsuariosGlpi();
  const chamados = await prisma.glpiSyncStatus.findUnique({ where: { chave: "chamados_glpi" } });
  const alertas = await prisma.glpiSyncStatus.findUnique({ where: { chave: "alertas_glpi" } });
  return NextResponse.json({ usuarios, chamados, alertas });
}
