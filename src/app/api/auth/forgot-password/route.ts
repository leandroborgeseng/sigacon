import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators";
import { appBaseUrl } from "@/lib/app-url";
import { gerarTokenResetSenha, hashTokenResetSenha } from "@/lib/senha-reset-token";
import { enviarEmailResend } from "@/server/services/email-resend";

const RESPOSTA_GENERICA =
  "Se existir uma conta ativa com esse e-mail, você receberá um link para redefinir a senha em instantes.";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "E-mail inválido.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nome: true, ativo: true },
    });

    if (user?.ativo) {
      await prisma.senhaResetToken.deleteMany({
        where: { usuarioId: user.id, usadoEm: null },
      });

      const token = gerarTokenResetSenha();
      const tokenHash = hashTokenResetSenha(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.senhaResetToken.create({
        data: {
          usuarioId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const base = appBaseUrl();
      const link = `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
      const nomeSeguro = escapeHtml(user.nome);

      const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Olá, ${nomeSeguro}.</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta no LeX.</p>
  <p><a href="${link}" style="color: #2563eb;">Redefinir senha</a></p>
  <p style="font-size: 14px; color: #555;">O link expira em 1 hora. Se você não pediu isso, ignore este e-mail.</p>
  <p style="font-size: 12px; color: #888;">Se o botão não funcionar, copie e cole no navegador:<br/>${escapeHtml(link)}</p>
</body>
</html>`.trim();

      const envio = await enviarEmailResend({
        to: email,
        subject: "LeX — Redefinir senha",
        html,
        text: `Olá, ${user.nome}. Redefina sua senha acessando: ${link} (válido por 1 hora).`,
      });

      if (!envio.ok) {
        console.error("[forgot-password] Resend:", envio.detail);
      }
    }

    return NextResponse.json({ ok: true, message: RESPOSTA_GENERICA });
  } catch (e) {
    console.error("forgot-password:", e);
    return NextResponse.json({ message: "Erro ao processar solicitação." }, { status: 500 });
  }
}
