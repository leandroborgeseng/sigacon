/**
 * Envio transacional via Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Requer RESEND_API_KEY e RESEND_FROM no ambiente.
 */
export type ResendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function enviarEmailResend(
  opts: ResendEmailOpts
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey) {
    return { ok: false, detail: "RESEND_API_KEY não configurada" };
  }
  if (!from) {
    return { ok: false, detail: "RESEND_FROM não configurado (ex.: LeX <noreply@seudominio.com>)" };
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, detail: `Resend HTTP ${r.status}: ${detail.slice(0, 400)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
