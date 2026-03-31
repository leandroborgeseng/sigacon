import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

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
  const q = (searchParams.get("q") || "").trim();
  const somenteAbertos = (searchParams.get("somenteAbertos") || "1") === "1";
  const limit = Math.max(5, Math.min(50, Number(searchParams.get("limit") || "20")));
  const cursor = searchParams.get("cursor");
  const offsetParam = cursor ?? searchParams.get("offset") ?? "0";
  const offset = Math.max(0, Number(offsetParam));

  const maybeTicketId = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;

  const whereBase: Record<string, unknown> = {
    ...(somenteAbertos ? { statusGlpi: { in: [1, 2, 3, 4] } } : {}),
  };

  const where =
    !q
      ? whereBase
      : maybeTicketId
        ? {
            ...whereBase,
            OR: [
              { glpiTicketId: maybeTicketId },
              { titulo: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {
            ...whereBase,
            OR: [
              { titulo: { contains: q, mode: "insensitive" as const } },
              { fornecedorNome: { contains: q, mode: "insensitive" as const } },
              { tecnicoResponsavelNome: { contains: q, mode: "insensitive" as const } },
            ],
          };

  const fetchTake = q ? Math.min(120, limit * 3) : limit;
  const [rows, total] = await Promise.all([
    prisma.glpiChamado.findMany({
      where,
      orderBy: [{ dataModificacao: "desc" }, { glpiTicketId: "desc" }],
      skip: offset,
      take: fetchTake,
      select: {
        id: true,
        glpiTicketId: true,
        titulo: true,
        statusLabel: true,
        statusGlpi: true,
        dataModificacao: true,
      },
    }),
    prisma.glpiChamado.count({ where }),
  ]);

  const items = [...rows]
    .sort((a, b) => {
      if (!q) return 0;
      const term = q.toLowerCase().replace("#", "");
      const ta = a.titulo.toLowerCase();
      const tb = b.titulo.toLowerCase();
      const score = (ticketId: number, titulo: string) => {
        const sid = String(ticketId);
        if (sid === term) return 0;
        if (sid.startsWith(term)) return 1;
        if (titulo.startsWith(term)) return 2;
        if (titulo.includes(term)) return 3;
        return 4;
      };
      const sa = score(a.glpiTicketId, ta);
      const sb = score(b.glpiTicketId, tb);
      if (sa !== sb) return sa - sb;
      return b.glpiTicketId - a.glpiTicketId;
    })
    .slice(0, limit);

  return NextResponse.json({
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
    nextCursor: offset + items.length < total ? String(offset + items.length) : null,
  });
}
