import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { aditivoContratoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, aid } = await params;
  const existing = await prisma.aditivoContrato.findFirst({ where: { id: aid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = aditivoContratoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.aditivoContrato.update({
    where: { id: aid },
    data: {
      ...(parsed.data.numeroAditivo != null && { numeroAditivo: parsed.data.numeroAditivo.trim() }),
      ...(parsed.data.dataRegistro != null && { dataRegistro: parsed.data.dataRegistro }),
      ...(parsed.data.objeto !== undefined && { objeto: parsed.data.objeto }),
      ...(parsed.data.valorAnterior !== undefined && { valorAnterior: parsed.data.valorAnterior }),
      ...(parsed.data.valorNovo !== undefined && { valorNovo: parsed.data.valorNovo }),
      ...(parsed.data.vigenciaFimAnterior !== undefined && { vigenciaFimAnterior: parsed.data.vigenciaFimAnterior }),
      ...(parsed.data.vigenciaFimNova !== undefined && { vigenciaFimNova: parsed.data.vigenciaFimNova }),
      ...(parsed.data.observacoes !== undefined && { observacoes: parsed.data.observacoes }),
    },
  });
  await registerAudit({
    entidade: "AditivoContrato",
    entidadeId: aid,
    acao: "ATUALIZACAO",
    valorAnterior: existing,
    valorNovo: row,
    usuarioId: session.id,
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId, aid } = await params;
  const existing = await prisma.aditivoContrato.findFirst({ where: { id: aid, contratoId } });
  if (!existing) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });
  await prisma.aditivoContrato.delete({ where: { id: aid } });
  await registerAudit({
    entidade: "AditivoContrato",
    entidadeId: aid,
    acao: "EXCLUSAO",
    valorAnterior: existing,
    valorNovo: null,
    usuarioId: session.id,
  });
  return NextResponse.json({ ok: true });
}
