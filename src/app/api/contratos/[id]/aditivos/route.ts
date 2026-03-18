import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { aditivoContratoSchema } from "@/lib/validators";
import { registerAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CONTRATOS, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
  const { id: contratoId } = await params;
  const rows = await prisma.aditivoContrato.findMany({
    where: { contratoId },
    orderBy: { dataRegistro: "desc" },
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
  const parsed = aditivoContratoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.aditivoContrato.create({
    data: {
      contratoId,
      numeroAditivo: parsed.data.numeroAditivo.trim(),
      dataRegistro: parsed.data.dataRegistro,
      objeto: parsed.data.objeto ?? null,
      valorAnterior: parsed.data.valorAnterior ?? null,
      valorNovo: parsed.data.valorNovo ?? null,
      vigenciaFimAnterior: parsed.data.vigenciaFimAnterior ?? null,
      vigenciaFimNova: parsed.data.vigenciaFimNova ?? null,
      observacoes: parsed.data.observacoes ?? null,
    },
  });
  await registerAudit({
    entidade: "AditivoContrato",
    entidadeId: row.id,
    acao: "CRIACAO",
    valorAnterior: null,
    valorNovo: row,
    usuarioId: session.id,
  });
  return NextResponse.json(row);
}
