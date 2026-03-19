import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { totaisUstNoAno } from "@/lib/ust-limits";

/** Detalhamento para modal de alerta UST: totais + maiores lançamentos no ano. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id: contratoId } = await params;
  const ano = parseInt(new URL(request.url).searchParams.get("ano") ?? "", 10) || new Date().getFullYear();

  const c = await prisma.contrato.findUnique({
    where: { id: contratoId },
    select: {
      nome: true,
      limiteUstAno: true,
      limiteValorUstAno: true,
    },
  });
  if (!c) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });

  const t = await totaisUstNoAno(contratoId, ano);
  const lu = c.limiteUstAno != null ? Number(c.limiteUstAno) : null;
  const lv = c.limiteValorUstAno != null ? Number(c.limiteValorUstAno) : null;

  const top = await prisma.lancamentoUst.findMany({
    where: { contratoId, competenciaAno: ano },
    orderBy: { totalUst: "desc" },
    take: 15,
    select: {
      id: true,
      competenciaMes: true,
      quantidade: true,
      totalUst: true,
      valorMonetario: true,
      tipoAtividade: { select: { nome: true } },
    },
  });

  return NextResponse.json({
    ano,
    contratoNome: c.nome,
    totalUst: t.totalUst,
    totalValor: t.totalValor,
    limiteUstAno: lu,
    limiteValorUstAno: lv,
    pctUst: lu && lu > 0 ? Math.round((t.totalUst / lu) * 1000) / 10 : null,
    pctValor: lv && lv > 0 ? Math.round((t.totalValor / lv) * 1000) / 10 : null,
    maioresLancamentos: top.map((x) => ({
      id: x.id,
      mes: x.competenciaMes,
      tipo: x.tipoAtividade.nome,
      qtd: x.quantidade,
      ust: Number(x.totalUst),
      valor: Number(x.valorMonetario),
    })),
  });
}
