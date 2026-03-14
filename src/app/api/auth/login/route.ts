import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user || !user.ativo) {
      return NextResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(parsed.data.senha, user.senhaHash);
    if (!valid) {
      return NextResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    await createSession({
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { message: "Erro ao processar login." },
      { status: 500 }
    );
  }
}
