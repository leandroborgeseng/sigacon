import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PerfilUsuario } from "@prisma/client";

function escCsv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (session.perfil !== PerfilUsuario.ADMIN) {
    return NextResponse.json({ message: "Somente administrador" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entidade = searchParams.get("entidade")?.trim();
  const acao = searchParams.get("acao")?.trim();
  const format = searchParams.get("format");
  const take = Math.min(parseInt(searchParams.get("take") ?? "200", 10) || 200, 2000);

  const rows = await prisma.historicoAuditoria.findMany({
    where: {
      ...(entidade ? { entidade: { contains: entidade } } : {}),
      ...(acao ? { acao: { contains: acao } } : {}),
    },
    orderBy: { criadoEm: "desc" },
    take,
    include: { usuario: { select: { nome: true, email: true } } },
  });

  if (format === "csv") {
    const header = "criado_em,usuario,email,entidade,entidade_id,acao\n";
    const body = rows
      .map((r) =>
        [
          r.criadoEm.toISOString(),
          escCsv(r.usuario?.nome ?? ""),
          escCsv(r.usuario?.email ?? ""),
          escCsv(r.entidade),
          escCsv(r.entidadeId),
          escCsv(r.acao),
        ].join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      entidade: r.entidade,
      entidadeId: r.entidadeId,
      acao: r.acao,
      criadoEm: r.criadoEm.toISOString(),
      usuario: r.usuario?.nome ?? r.usuario?.email ?? null,
    }))
  );
}
