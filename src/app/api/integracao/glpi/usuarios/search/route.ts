import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRecurso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { glpiSearchUsers, glpiWithSession } from "@/lib/glpi-client";

function normalizarBusca(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function upsertUsuariosGlpiCache(
  entries: Array<{
    id: number;
    name: string;
    fullName?: string | null;
    login?: string | null;
    email?: string | null;
  }>
) {
  await Promise.all(
    entries.map((u) =>
      prisma.glpiUsuarioCache.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          nome: u.name,
          nomeCompleto: u.fullName ?? null,
          login: u.login ?? null,
          email: u.email ?? null,
          nomeBusca: normalizarBusca(u.name),
          ativo: true,
          sincronizadoEm: new Date(),
        },
        update: {
          nome: u.name,
          nomeCompleto: u.fullName ?? null,
          login: u.login ?? null,
          email: u.email ?? null,
          nomeBusca: normalizarBusca(u.name),
          ativo: true,
          sincronizadoEm: new Date(),
        },
      })
    )
  );
}

function buscaNoCacheWhere(q: string, termos: string) {
  if (q.length < 2) {
    return { ativo: true };
  }
  return {
    ativo: true,
    OR: [
      { nomeBusca: { contains: termos, mode: "insensitive" as const } },
      { nome: { contains: q, mode: "insensitive" as const } },
      { nomeCompleto: { contains: q, mode: "insensitive" as const } },
      { login: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const [podeCustomizacao, podeContratosEditar] = await Promise.all([
    canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar"),
    canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar"),
  ]);
  if (!podeCustomizacao && !podeContratosEditar) {
    return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = Number(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor");
  const offsetParam = cursor ?? searchParams.get("offset") ?? "0";
  const offset = Math.max(0, Number(offsetParam));
  const termos = q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  /** Sempre tenta GLPI primeiro: lista paginada (q vazio) ou busca (q com 2+ caracteres). */
  try {
    const effectiveQ = q.length >= 2 ? q : "";
    const pageLimit =
      q.length >= 2
        ? Math.max(5, Math.min(50, Number.isFinite(limitParam) ? limitParam : 20))
        : Math.max(20, Math.min(200, Number.isFinite(limitParam) ? limitParam : 200));

    const { items: glpiItems, hasMore } = await glpiWithSession((ctx) =>
      glpiSearchUsers(ctx, { q: effectiveQ, offset, limit: pageLimit })
    );

    void upsertUsuariosGlpiCache(glpiItems).catch(() => {});

    let out = glpiItems;
    if (q.length === 1) {
      const t = q.toLowerCase();
      out = glpiItems.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(t)) ||
          (u.fullName && u.fullName.toLowerCase().includes(t)) ||
          (u.login && u.login.toLowerCase().includes(t)) ||
          (u.email && u.email.toLowerCase().includes(t))
      );
    }

    return NextResponse.json({
      items: out.map((u) => ({
        id: u.id,
        name: (u.fullName && u.fullName.trim()) || u.name,
      })),
      offset,
      limit: pageLimit,
      hasMore,
      totalEstimado: hasMore ? offset + glpiItems.length + 1 : offset + glpiItems.length,
      nextCursor: hasMore ? String(offset + glpiItems.length) : null,
    });
  } catch {
    /* GLPI indisponível: cache local */
  }

  try {
    const where = buscaNoCacheWhere(q, termos);
    const limit = Math.max(5, Math.min(200, Number(searchParams.get("limit") || "20")));
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
        nextCursor: null,
      },
      { status: 502 }
    );
  }
}
