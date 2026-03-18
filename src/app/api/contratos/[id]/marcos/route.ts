import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao, StatusMarcoImplantacao } from "@prisma/client";
import { marcoImplantacaoSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const rows = await prisma.marcoImplantacao.findMany({
    where: { contratoId },
    orderBy: [{ ordem: "asc" }, { dataPrevista: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "editar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const c = await prisma.contrato.findUnique({ where: { id: contratoId } });
  if (!c) return NextResponse.json({ message: "Contrato não encontrado" }, { status: 404 });
  const body = await request.json();
  const parsed = marcoImplantacaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.marcoImplantacao.create({
    data: {
      contratoId,
      titulo: parsed.data.titulo.trim(),
      descricao: parsed.data.descricao ?? null,
      dataPrevista: parsed.data.dataPrevista,
      dataRealizada: parsed.data.dataRealizada ?? null,
      status: parsed.data.status ?? StatusMarcoImplantacao.PLANEJADO,
      ordem: parsed.data.ordem ?? 0,
    },
  });
  return NextResponse.json(row);
}
