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
  const limit = Math.max(5, Math.min(50, Number(searchParams.get("limit") || "20")));
  const cursor = searchParams.get("cursor");
  const offsetParam = cursor ?? searchParams.get("offset") ?? "0";
  const offset = Math.max(0, Number(offsetParam));
  const termos = q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  try {
    const where = q.length >= 2
      ? {
          ativo: true,
          OR: [
            { nomeBusca: { contains: termos, mode: "insensitive" as const } },
            { nome: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : { ativo: true };
    const [items, total] = await Promise.all([
      prisma.glpiUsuarioCache.findMany({
        where,
        orderBy: { nome: "asc" },
        skip: offset,
        take: limit,
        select: { id: true, nome: true },
      }),
      prisma.glpiUsuarioCache.count({ where }),
    ]);
    return NextResponse.json({
      items: items.map((u) => ({ id: u.id, name: u.nome })),
      offset,
      limit,
      hasMore: offset + items.length < total,
      totalEstimado: total,
      nextCursor: offset + items.length < total ? String(offset + items.length) : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        message: e instanceof Error ? e.message : "Erro ao buscar usuários GLPI",
        items: [],
        hasMore: false,
        totalEstimado: 0,
      },
      { status: 502 }
    );
  }
}
