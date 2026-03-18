import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { servicoCatalogoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const c = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  const rows = await prisma.servicoCatalogo.findMany({
    where: { contratoId },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
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
  const c = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = servicoCatalogoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.servicoCatalogo.create({
    data: {
      contratoId,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      unidadeMedicao: parsed.data.unidadeMedicao,
      valorUnitario: parsed.data.valorUnitario,
      slaTexto: parsed.data.slaTexto ?? null,
      formaComprovacao: parsed.data.formaComprovacao ?? null,
      ustReferencia: parsed.data.ustReferencia ?? null,
      ativo: parsed.data.ativo ?? true,
      ordem: parsed.data.ordem ?? 0,
    },
  });
  await registerAudit({
    entidade: "ServicoCatalogo",
    entidadeId: row.id,
    acao: "CRIACAO",
    valorAnterior: null,
    valorNovo: row,
    usuarioId: session.id,
  });
  return NextResponse.json(row);
}
