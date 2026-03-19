import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { getOrCreateMedicao } from "@/server/services/medicao";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.MEDICOES, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json();
    const ano = Number(body.ano);
    const mes = Number(body.mes);
    if (!ano || !mes || mes < 1 || mes > 12) {
      return NextResponse.json({ message: "ano e mes inválidos" }, { status: 400 });
    }

    let contratoIds: string[] = [];
    if (Array.isArray(body.contratoIds) && body.contratoIds.length > 0) {
      contratoIds = body.contratoIds.filter((x: unknown) => typeof x === "string");
    } else if (body.todos) {
      const c = await prisma.contrato.findMany({
        where: { status: "ATIVO", ativo: true },
        select: { id: true },
      });
      contratoIds = c.map((x) => x.id);
    } else {
      return NextResponse.json(
        { message: "Informe todos: true ou contratoIds: []" },
        { status: 400 }
      );
    }

    if (contratoIds.length > 80) {
      return NextResponse.json({ message: "Máximo 80 contratos por lote" }, { status: 400 });
    }

    let okCount = 0;
    const erros: string[] = [];
    for (const cid of contratoIds) {
      try {
        await getOrCreateMedicao(cid, ano, mes);
        okCount++;
      } catch (e) {
        erros.push(`${cid}: ${e instanceof Error ? e.message : "erro"}`);
      }
    }

    return NextResponse.json({
      processados: contratoIds.length,
      sucesso: okCount,
      erros: erros.slice(0, 20),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Erro no lote" }, { status: 500 });
  }
}
