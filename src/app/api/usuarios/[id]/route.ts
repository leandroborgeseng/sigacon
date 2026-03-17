import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { usuarioUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";
import { PerfilUsuario } from "@prisma/client";

function isAdmin(perfil: string): boolean {
  return perfil === PerfilUsuario.ADMIN;
}

const selectPublic = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: selectPublic,
  });
  if (!usuario) return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(usuario);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.usuario.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = usuarioUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data: { nome?: string; email?: string; senhaHash?: string; perfil?: PerfilUsuario; ativo?: boolean } = {};
    if (parsed.data.nome != null) data.nome = parsed.data.nome;
    if (parsed.data.email != null) {
      const outro = await prisma.usuario.findFirst({ where: { email: parsed.data.email, id: { not: id } } });
      if (outro) return NextResponse.json({ message: "Já existe outro usuário com este e-mail" }, { status: 400 });
      data.email = parsed.data.email;
    }
    if (parsed.data.senha != null && parsed.data.senha !== "") {
      data.senhaHash = await hashPassword(parsed.data.senha);
    }
    if (parsed.data.perfil != null) data.perfil = parsed.data.perfil;
    if (parsed.data.ativo !== undefined) data.ativo = parsed.data.ativo;

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: selectPublic,
    });
    return NextResponse.json(usuario);
  } catch (e) {
    console.error("Update usuario error:", e);
    return NextResponse.json({ message: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ message: "Você não pode excluir sua própria conta" }, { status: 400 });
  }

  const existing = await prisma.usuario.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });

  try {
    await prisma.usuario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete usuario error:", e);
    return NextResponse.json({ message: "Erro ao excluir usuário" }, { status: 500 });
  }
}
