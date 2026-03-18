import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRecurso, isAdmin } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";
import { tipoAtividadeUstSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const ok = await canRecurso(session.perfil as PerfilUsuario, RecursoPermissao.CUSTOMIZACAO, "visualizar");
  if (!ok) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const tipos = await prisma.tipoAtividadeUst.findMany({
    where: isAdmin(session.perfil as PerfilUsuario) ? {} : { ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(tipos);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil as PerfilUsuario)) {
    return NextResponse.json({ message: "Somente administrador" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = tipoAtividadeUstSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos", errors: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.tipoAtividadeUst.create({
    data: {
      nome: parsed.data.nome,
      categoria: parsed.data.categoria,
      complexidade: parsed.data.complexidade ?? null,
      ustFixo: parsed.data.ustFixo,
      ativo: parsed.data.ativo ?? true,
      ordem: parsed.data.ordem ?? 100,
    },
  });
  return NextResponse.json(row);
}
