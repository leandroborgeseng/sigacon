import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusAlerta, TipoAlertaGlpi } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const [abertos, porTipo] = await Promise.all([
    prisma.alertaGlpiChamado.count({ where: { status: StatusAlerta.ABERTO } }),
    prisma.alertaGlpiChamado.groupBy({
      by: ["tipo"],
      where: { status: StatusAlerta.ABERTO },
      _count: { _all: true },
    }),
  ]);

  const byTipo: Record<TipoAlertaGlpi, number> = {
    [TipoAlertaGlpi.SEM_ATRIBUICAO]: 0,
    [TipoAlertaGlpi.SLA_ESTOURADO]: 0,
  };
  for (const row of porTipo) byTipo[row.tipo] = row._count._all;

  return NextResponse.json({ abertos, byTipo });
}
