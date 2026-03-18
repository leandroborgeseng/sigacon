import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { lancamentoUstUpdateSchema } from "@/lib/validators";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, lid } = await params;
  const existing = await prisma.lancamentoUst.findFirst({
    where: { id: lid, contratoId },
    include: { anexoEvidencia: true },
  });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = lancamentoUstUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }

  const ano = parsed.data.competenciaAno ?? existing.competenciaAno;
  const mes = parsed.data.competenciaMes ?? existing.competenciaMes;
  const tipoId = parsed.data.tipoAtividadeUstId ?? existing.tipoAtividadeUstId;
  const tipo = await prisma.tipoAtividadeUst.findFirst({ where: { id: tipoId, ativo: true } });
  if (!tipo) return NextResponse.json({ message: "Tipo inválido" }, { status: 400 });

  const contrato = await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } });
  let servicoId = parsed.data.servicoCatalogoId !== undefined ? parsed.data.servicoCatalogoId : existing.servicoCatalogoId;
  let servico = null;
  if (servicoId) {
    servico = await prisma.servicoCatalogo.findFirst({ where: { id: servicoId, contratoId, ativo: true } });
  }
  const q = parsed.data.quantidade ?? existing.quantidade;
  const totalUst = q * Number(tipo.ustFixo);

  const glpi = parsed.data.evidenciaGlpiTicketId !== undefined ? parsed.data.evidenciaGlpiTicketId : existing.evidenciaGlpiTicketId;
  const url = parsed.data.evidenciaUrl !== undefined ? parsed.data.evidenciaUrl : existing.evidenciaUrl;
  const desc = parsed.data.evidenciaDescricao !== undefined ? parsed.data.evidenciaDescricao : existing.evidenciaDescricao;
  const merged = { evidenciaGlpiTicketId: glpi, evidenciaUrl: url, evidenciaDescricao: desc };
  if (!temEvidencia(merged) && !existing.anexoEvidencia) {
    return NextResponse.json(
      { message: "Mantenha evidência (ticket, URL, descrição ou anexo)" },
      { status: 400 }
    );
  }

  const valorNum = valorMonetarioLancamentoUst({
    quantidade: q,
    totalUst,
    contrato,
    servico,
  });

  const limUst = contrato.limiteUstAno != null ? Number(contrato.limiteUstAno) : null;
  const limVal = contrato.limiteValorUstAno != null ? Number(contrato.limiteValorUstAno) : null;
  if ((limUst != null && limUst > 0) || (limVal != null && limVal > 0)) {
    const act = await totaisUstNoAno(contratoId, ano, lid);
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

  const row = await prisma.lancamentoUst.update({
    where: { id: lid },
    data: {
      tipoAtividadeUstId: tipo.id,
      servicoCatalogoId: servico?.id ?? null,
      competenciaAno: ano,
      competenciaMes: mes,
      quantidade: q,
      totalUst: toDecimal(totalUst),
      valorMonetario: toDecimal(valorNum),
      evidenciaGlpiTicketId: glpi?.trim() || null,
      evidenciaUrl: url?.trim() || null,
      evidenciaDescricao: desc?.trim() || null,
      ...(parsed.data.medicaoMensalId !== undefined && { medicaoMensalId: parsed.data.medicaoMensalId }),
    },
  });

  await registerAudit({
    entidade: "LancamentoUst",
    entidadeId: lid,
    acao: "ATUALIZACAO",
    valorAnterior: existing,
    valorNovo: row,
    usuarioId: session.id,
  });

  await sincronizarUstNaMedicao(contratoId, existing.competenciaAno, existing.competenciaMes);
  if (ano !== existing.competenciaAno || mes !== existing.competenciaMes) {
    await sincronizarUstNaMedicao(contratoId, ano, mes);
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; lid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, lid } = await params;
  const existing = await prisma.lancamentoUst.findFirst({ where: { id: lid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });

  await prisma.anexo.deleteMany({ where: { lancamentoUstId: lid } });
  await prisma.lancamentoUst.delete({ where: { id: lid } });
  await registerAudit({
    entidade: "LancamentoUst",
    entidadeId: lid,
    acao: "EXCLUSAO",
    valorAnterior: existing,
    valorNovo: null,
    usuarioId: session.id,
  });
  await sincronizarUstNaMedicao(contratoId, existing.competenciaAno, existing.competenciaMes);
  return NextResponse.json({ ok: true });
}
