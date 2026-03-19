import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

function esc(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const pode = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.DASHBOARD, "visualizar");
  if (!pode) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const ano = parseInt(searchParams.get("ano") ?? "", 10) || new Date().getFullYear();
  const mes = parseInt(searchParams.get("mes") ?? "", 10) || new Date().getMonth() + 1;
  const format = searchParams.get("format") ?? "json";

  const contratos = await prisma.contrato.findMany({
    where: { status: "ATIVO", ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, numeroContrato: true, vigenciaFim: true },
  });

  const medicoes = await prisma.medicaoMensal.findMany({
    where: { ano, mes, contratoId: { in: contratos.map((c) => c.id) } },
  });
  const medMap = new Map(medicoes.map((m) => [m.contratoId, m]));

  const ustAgg = await prisma.lancamentoUst.groupBy({
    by: ["contratoId"],
    where: { competenciaAno: ano, competenciaMes: mes },
    _count: true,
    _sum: { totalUst: true, valorMonetario: true },
  });
  const ustMap = new Map(ustAgg.map((u) => [u.contratoId, u]));

  const hoje = new Date();
  const em90 = new Date(hoje);
  em90.setDate(em90.getDate() + 90);

  const rows = contratos.map((c) => {
    const m = medMap.get(c.id);
    const u = ustMap.get(c.id);
    const vence = c.vigenciaFim <= em90 && c.vigenciaFim >= hoje;
    return {
      contrato: c.nome,
      numero: c.numeroContrato,
      temMedicao: !!m,
      percentual: m ? Number(m.percentualCumprido).toFixed(2) : "",
      valorDevido: m ? Number(m.valorDevidoMes).toFixed(2) : "",
      valorGlosado: m ? Number(m.valorGlosadoMes).toFixed(2) : "",
      lancamentosUst: u?._count ?? 0,
      totalUstMes: u?._sum.totalUst != null ? Number(u._sum.totalUst).toFixed(2) : "",
      valorUstMes: u?._sum.valorMonetario != null ? Number(u._sum.valorMonetario).toFixed(2) : "",
      vigencia90d: vence ? "sim" : "não",
    };
  });

  if (format === "csv") {
    const h =
      "contrato,numero,tem_medicao,percentual_cumprido,valor_devido,valor_glosado,lancamentos_ust,total_ust_mes,valor_ust_mes,vigencia_90d\n";
    const b = rows
      .map((r) =>
        [
          esc(r.contrato),
          esc(r.numero),
          r.temMedicao ? "sim" : "não",
          r.percentual,
          r.valorDevido,
          r.valorGlosado,
          String(r.lancamentosUst),
          r.totalUstMes,
          r.valorUstMes,
          r.vigencia90d,
        ].join(",")
      )
      .join("\n");
    return new NextResponse("\uFEFF" + h + b, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="executivo-${ano}-${mes}.csv"`,
      },
    });
  }

  return NextResponse.json({
    competencia: { ano, mes },
    geradoEm: new Date().toISOString(),
    linhas: rows,
  });
}
