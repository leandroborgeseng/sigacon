import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators";
import { hashTokenResetSenha } from "@/lib/senha-reset-token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tokenHash = hashTokenResetSenha(parsed.data.token);
    const agora = new Date();

    const row = await prisma.senhaResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: agora },
        usadoEm: null,
      },
      select: { id: true, usuarioId: true },
    });

    if (!row) {
      return NextResponse.json(
        { message: "Link inválido ou expirado. Solicite um novo e-mail em Esqueci minha senha." },
        { status: 400 }
      );
    }

    const novaHash = await hashPassword(parsed.data.senha);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: row.usuarioId },
        data: { senhaHash: novaHash },
      }),
      prisma.senhaResetToken.update({
        where: { id: row.id },
        data: { usadoEm: agora },
      }),
      prisma.senhaResetToken.deleteMany({
        where: { usuarioId: row.usuarioId, usadoEm: null, id: { not: row.id } },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Senha alterada. Você já pode entrar com a nova senha." });
  } catch (e) {
    console.error("reset-password:", e);
    return NextResponse.json({ message: "Erro ao redefinir senha." }, { status: 500 });
  }
}
