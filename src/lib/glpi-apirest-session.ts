/**
 * initSession da API REST legada GLPI (apirest.php + user_token + App-Token).
 * Vários retries por incompatibilidades de proxy / formato de resposta.
 */

export function parseGlpiApiErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "(corpo vazio)";
  try {
    const j = JSON.parse(trimmed) as unknown;
    if (Array.isArray(j)) {
      const parts = j
        .map((x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : JSON.stringify(x)))
        .filter((s) => s.length > 0);
      if (parts.length) return parts.join(" — ").slice(0, 500);
    }
    if (j && typeof j === "object") {
      if ("message" in j) return String((j as { message: unknown }).message).slice(0, 500);
      const o = j as { title?: unknown; detail?: unknown; status?: unknown };
      if (typeof o.title === "string" || typeof o.detail === "string") {
        return [o.status, o.title, o.detail].filter((x): x is string => typeof x === "string").join(": ").slice(0, 500);
      }
    }
  } catch {
    /* não é JSON */
  }
  return trimmed.slice(0, 500);
}

export type GlpiInitSessionOk = { sessionToken: string; via: string };
export type GlpiInitSessionFail = { status: number; body: string; detail: string; via: string };

type InitAttempt = { label: string; url: string; init: RequestInit };

function buildInitAttempts(base: string, appToken: string, userToken: string): InitAttempt[] {
  const attempts: InitAttempt[] = [];
  const paths = [`${base}/initSession/`, `${base}/initSession`];

  for (const url of paths) {
    attempts.push({
      label: `GET + Authorization user_token (${url.endsWith("/") ? "barra final" : "sem barra"})`,
      url,
      init: {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `user_token ${userToken}`,
          ...(appToken ? { "App-Token": appToken } : {}),
        },
      },
    });
    attempts.push({
      label: `GET user_token sem Content-Type (${url.endsWith("/") ? "barra" : "sem barra"})`,
      url,
      init: {
        method: "GET",
        headers: {
          Authorization: `user_token ${userToken}`,
          ...(appToken ? { "App-Token": appToken } : {}),
        },
      },
    });
  }

  const qs = new URLSearchParams();
  qs.set("user_token", userToken);
  if (appToken) qs.set("app_token", appToken);
  attempts.push({
    label: "GET initSession?user_token=… (fallback se proxy remove Authorization)",
    url: `${base}/initSession?${qs.toString()}`,
    init: {
      method: "GET",
      headers: appToken ? { "App-Token": appToken } : {},
    },
  });

  return attempts;
}

export async function glpiLegacyInitSession(
  base: string,
  appToken: string,
  userToken: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ ok: true; result: GlpiInitSessionOk } | { ok: false; result: GlpiInitSessionFail }> {
  const timeoutMs = opts?.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const signal = controller.signal;

  let lastFail: GlpiInitSessionFail | null = null;
  const app = appToken.trim();
  const user = userToken.trim();

  try {
    for (const { label, url, init } of buildInitAttempts(base, app, user)) {
      if (signal.aborted) break;
      try {
        const res = await fetch(url, { ...init, signal });
        const text = await res.text();
        if (!res.ok) {
          lastFail = {
            status: res.status,
            body: text,
            detail: parseGlpiApiErrorBody(text),
            via: label,
          };
          continue;
        }
        let j: { session_token?: string };
        try {
          j = JSON.parse(text) as { session_token?: string };
        } catch {
          lastFail = {
            status: res.status,
            body: text,
            detail: "Resposta não é JSON.",
            via: label,
          };
          continue;
        }
        const sessionToken = j.session_token;
        if (!sessionToken) {
          lastFail = {
            status: res.status,
            body: text,
            detail: "JSON sem session_token.",
            via: label,
          };
          continue;
        }
        clearTimeout(timer);
        return { ok: true, result: { sessionToken, via: label } };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        lastFail = {
          status: 0,
          body: "",
          detail: signal.aborted || msg.includes("abort") ? "Tempo esgotado ou requisição cancelada." : msg.slice(0, 200),
          via: label,
        };
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (lastFail) {
    return { ok: false, result: lastFail };
  }
  return {
    ok: false,
    result: { status: 0, body: "", detail: "Nenhuma tentativa concluída.", via: "none" },
  };
}
