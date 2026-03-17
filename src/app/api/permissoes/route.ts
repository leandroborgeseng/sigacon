import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

function isAdmin(perfil: string): boolean {
  return perfil === PerfilUsuario.ADMIN;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const rows = await prisma.permissaoPerfil.findMany({
    orderBy: [{ perfil: "asc" }, { recurso: "asc" }],
  });

  // Retorna como matriz: { perfil: { recurso: { podeVisualizar, podeEditar } } }
  const matrix: Record<string, Record<string, { podeVisualizar: boolean; podeEditar: boolean }>> = {};
  for (const p of Object.values(PerfilUsuario)) {
    matrix[p] = {};
    for (const r of Object.values(RecursoPermissao)) {
      const row = rows.find((x) => x.perfil === p && x.recurso === r);
      matrix[p][r] = row
        ? { podeVisualizar: row.podeVisualizar, podeEditar: row.podeEditar }
        : { podeVisualizar: true, podeEditar: p === PerfilUsuario.ADMIN };
    }
  }
  return NextResponse.json(matrix);
}

const permissoesUpdateSchema = {
  type: "object" as const,
  additionalProperties: {
    type: "object" as const,
    additionalProperties: {
      type: "object" as const,
      properties: {
        podeVisualizar: { type: "boolean" },
        podeEditar: { type: "boolean" },
      },
      required: ["podeVisualizar", "podeEditar"],
    },
  },
};

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ message: "Corpo inválido" }, { status: 400 });
    }

    for (const perfil of Object.values(PerfilUsuario)) {
      const recs = body[perfil];
      if (typeof recs !== "object" || recs === null) continue;
      for (const recurso of Object.values(RecursoPermissao)) {
        const cell = recs[recurso];
        if (!cell || typeof cell.podeVisualizar !== "boolean" || typeof cell.podeEditar !== "boolean") continue;
        await prisma.permissaoPerfil.upsert({
          where: { perfil_recurso: { perfil, recurso } },
          update: { podeVisualizar: cell.podeVisualizar, podeEditar: cell.podeEditar },
          create: {
            perfil,
            recurso,
            podeVisualizar: cell.podeVisualizar,
            podeEditar: cell.podeEditar,
          },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update permissoes error:", e);
    return NextResponse.json({ message: "Erro ao salvar permissões" }, { status: 500 });
  }
}
