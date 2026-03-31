import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao, StatusAlerta } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const pode = await canRecurso(
    session.perfil as PerfilUsuario,
    RecursoPermissao.CUSTOMIZACAO,
    "visualizar"
  );
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "ABERTO" || statusParam === "RESOLVIDO"
      ? (statusParam as StatusAlerta)
      : undefined;

  const items = await prisma.alertaGlpiChamado.findMany({
    where: status ? { status } : {},
    include: {
      chamado: {
        select: {
          glpiTicketId: true,
          titulo: true,
          tecnicoResponsavelNome: true,
          statusGlpi: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { ultimaDeteccaoEm: "desc" }],
    take: 500,
  });

  return NextResponse.json({ items });
}
