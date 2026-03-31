const ALERT_EMAIL_API_URL = process.env.ALERT_EMAIL_API_URL?.trim();
const ALERT_EMAIL_API_KEY = process.env.ALERT_EMAIL_API_KEY?.trim();

export type EmailPayload = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

export async function enviarEmailAlerta(payload: EmailPayload): Promise<{ ok: boolean; detail?: string }> {
  if (!ALERT_EMAIL_API_URL) {
    return { ok: false, detail: "ALERT_EMAIL_API_URL não configurada" };
  }

  try {
    const r = await fetch(ALERT_EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ALERT_EMAIL_API_KEY ? { Authorization: `Bearer ${ALERT_EMAIL_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { ok: false, detail: `HTTP ${r.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
