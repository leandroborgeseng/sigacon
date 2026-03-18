import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { lancamentoUstCreateSchema } from "@/lib/validators";
import { valorMonetarioLancamentoUst } from "@/server/services/ust-finance";
import { toDecimal } from "@/lib/finance";
import { sincronizarUstNaMedicao } from "@/server/services/medicao";
import { registerAudit } from "@/server/services/audit";
import { totaisUstNoAno, validarLimitesUst } from "@/lib/ust-limits";

function temEvidencia(p: {
  evidenciaGlpiTicketId?: string | null;
  evidenciaUrl?: string | null;
  evidenciaDescricao?: string | null;
}) {
  const g = p.evidenciaGlpiTicketId?.trim();
  const u = p.evidenciaUrl?.trim();
  const d = p.evidenciaDescricao?.trim();
  return !!(g || u || (d && d.length >= 10));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const { searchParams } = new URL(request.url);
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");
  const where: { contratoId: string; competenciaAno?: number; competenciaMes?: number } = { contratoId };
  if (ano) where.competenciaAno = parseInt(ano, 10);
  if (mes) where.competenciaMes = parseInt(mes, 10);

  const rows = await prisma.lancamentoUst.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: {
      tipoAtividade: { select: { id: true, nome: true, categoria: true, ustFixo: true } },
      servicoCatalogo: { select: { id: true, nome: true, unidadeMedicao: true } },
      anexoEvidencia: { select: { id: true, nomeOriginal: true, nomeArquivo: true } },
      usuario: { select: { id: true, nome: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!contrato) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = lancamentoUstCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  if (!temEvidencia(parsed.data)) {
    return NextResponse.json(
      {
        message:
          "Evidência obrigatória: informe ID do ticket (GLPI), URL ou descrição (mín. 10 caracteres). Anexo pode ser enviado após criar o lançamento.",
      },
      { status: 400 }
    );
  }

  const tipo = await prisma.tipoAtividadeUst.findFirst({
    where: { id: parsed.data.tipoAtividadeUstId, ativo: true },
  });
  if (!tipo) return NextResponse.json({ message: "Tipo de atividade inválido" }, { status: 400 });

  let servico = null;
  if (parsed.data.servicoCatalogoId) {
    servico = await prisma.servicoCatalogo.findFirst({
      where: { id: parsed.data.servicoCatalogoId, contratoId, ativo: true },
    });
    if (!servico) return NextResponse.json({ message: "Serviço do catálogo inválido" }, { status: 400 });
  }

  const q = parsed.data.quantidade ?? 1;
  const totalUst = q * Number(tipo.ustFixo);
  const valorNum = valorMonetarioLancamentoUst({
    quantidade: q,
    totalUst,
    contrato,
    servico,
  });

  const limUst = contrato.limiteUstAno != null ? Number(contrato.limiteUstAno) : null;
  const limVal = contrato.limiteValorUstAno != null ? Number(contrato.limiteValorUstAno) : null;
  if ((limUst != null && limUst > 0) || (limVal != null && limVal > 0)) {
    const act = await totaisUstNoAno(contratoId, parsed.data.competenciaAno);
    const chk = validarLimitesUst({
      limiteUstAno: limUst,
      limiteValorUstAno: limVal,
      ustAtualAno: act.totalUst,
      valorAtualAno: act.totalValor,
      ustAdicionar: totalUst,
      valorAdicionar: valorNum,
    });
    if (!chk.ok) return NextResponse.json({ message: chk.message }, { status: 400 });
  }

  const url = parsed.data.evidenciaUrl?.trim() || null;
  const row = await prisma.lancamentoUst.create({
    data: {
      contratoId,
      tipoAtividadeUstId: tipo.id,
      servicoCatalogoId: servico?.id ?? null,
      competenciaAno: parsed.data.competenciaAno,
      competenciaMes: parsed.data.competenciaMes,
      quantidade: q,
      totalUst: toDecimal(totalUst),
      valorMonetario: toDecimal(valorNum),
      evidenciaGlpiTicketId: parsed.data.evidenciaGlpiTicketId?.trim() || null,
      evidenciaUrl: url && url.length > 0 ? url : null,
      evidenciaDescricao: parsed.data.evidenciaDescricao?.trim() || null,
      medicaoMensalId: parsed.data.medicaoMensalId ?? null,
      usuarioId: session.id,
    },
    include: {
      tipoAtividade: true,
      servicoCatalogo: true,
    },
  });

  await registerAudit({
    entidade: "LancamentoUst",
    entidadeId: row.id,
    acao: "CRIACAO",
    valorAnterior: null,
    valorNovo: row,
    usuarioId: session.id,
  });

  await sincronizarUstNaMedicao(contratoId, parsed.data.competenciaAno, parsed.data.competenciaMes);
  return NextResponse.json(row);
}
