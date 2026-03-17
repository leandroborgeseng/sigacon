import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { usuarioCreateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";
import { PerfilUsuario } from "@prisma/client";

function isAdmin(perfil: string): boolean {
  return perfil === PerfilUsuario.ADMIN;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  });
  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (!isAdmin(session.perfil)) return NextResponse.json({ message: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = usuarioCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json({ message: "Já existe um usuário com este e-mail" }, { status: 400 });
    }

    const senhaHash = await hashPassword(parsed.data.senha);
    const usuario = await prisma.usuario.create({
      data: {
        nome: parsed.data.nome,
        email: parsed.data.email,
        senhaHash,
        perfil: parsed.data.perfil,
        ativo: parsed.data.ativo ?? true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
    });
    return NextResponse.json(usuario);
  } catch (e) {
    console.error("Create usuario error:", e);
    return NextResponse.json({ message: "Erro ao criar usuário" }, { status: 500 });
  }
}
