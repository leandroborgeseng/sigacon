import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { totaisUstNoAno } from "@/lib/ust-limits";

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
    select: { limiteUstAno: true, limiteValorUstAno: true },
  });
  if (!c) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const t = await totaisUstNoAno(contratoId, ano);
  const limUst = c.limiteUstAno != null ? Number(c.limiteUstAno) : null;
  const limVal = c.limiteValorUstAno != null ? Number(c.limiteValorUstAno) : null;
  return NextResponse.json({
    ano,
    totalUst: t.totalUst,
    totalValorUst: t.totalValor,
    limiteUstAno: limUst,
    limiteValorUstAno: limVal,
    pctUst: limUst && limUst > 0 ? Math.round((t.totalUst / limUst) * 1000) / 10 : null,
    pctValor: limVal && limVal > 0 ? Math.round((t.totalValor / limVal) * 1000) / 10 : null,
  });
}
