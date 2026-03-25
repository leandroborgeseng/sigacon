/**
 * initSession da API REST legada GLPI (apirest.php + user_token + App-Token).
 * Vários retries: barra final, query com tokens, base alternativa /apirest.php na raiz.
 */

/** Remove espaços e caracteres invisíveis comuns de copiar/colar. */
export function sanitizarTokenGlpi(valor: string): string {
  return valor.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

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

/** Se a base for …/api.php/v1/apirest.php, também tenta https://mesmo-host/apirest.php (doc GLPI / instalações Railway). */
export function alternativasBaseApirestUrl(normalizedBase: string): string[] {
  const base = normalizedBase.replace(/\/+$/, "");
  const list = [base];
  try {
    const u = new URL(base);
    if (/\/api\.php\/v\d+/i.test(u.pathname)) {
      const raiz = new URL("/apirest.php", u.origin).toString().replace(/\/+$/, "");
      if (raiz !== base && !list.includes(raiz)) list.push(raiz);
    }
  } catch {
    /* ignore */
  }
  return list;
}

export type GlpiInitSessionOk = { sessionToken: string; via: string };
export type GlpiInitSessionFail = { status: number; body: string; detail: string; via: string };

type InitAttempt = { label: string; url: string; init: RequestInit };

function buildInitAttempts(base: string, appToken: string, userToken: string): InitAttempt[] {
  const attempts: InitAttempt[] = [];
  const paths = [`${base}/initSession/`, `${base}/initSession`];

  for (const url of paths) {
    attempts.push({
      label: `Authorization user_token + JSON Content-Type (${url.endsWith("/") ? "/" : "sem /"})`,
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
      label: `Authorization user_token sem Content-Type (${url.endsWith("/") ? "/" : "sem /"})`,
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
  const q = qs.toString();
  // doc: tokens na query; barra antes de ? alinha com apirest.php/initSession/
  attempts.push({
    label: "GET initSession/?user_token=… (query, barra antes de ?)",
    url: `${base}/initSession/?${q}`,
    init: {
      method: "GET",
      headers: appToken ? { "App-Token": appToken } : {},
    },
  });
  attempts.push({
    label: "GET initSession?user_token=… (query, sem barra extra)",
    url: `${base}/initSession?${q}`,
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
  const timeoutMs = opts?.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const signal = controller.signal;

  let lastFail: GlpiInitSessionFail | null = null;
  const failuresShort: string[] = [];
  const app = sanitizarTokenGlpi(appToken);
  const user = sanitizarTokenGlpi(userToken);

  const bases = alternativasBaseApirestUrl(base.replace(/\/+$/, ""));

  try {
    for (const b of bases) {
      for (const { label, url, init } of buildInitAttempts(b, app, user)) {
        if (signal.aborted) break;
        try {
          const res = await fetch(url, { ...init, signal });
          const text = await res.text();
          if (!res.ok) {
            const detail = parseGlpiApiErrorBody(text);
            const pathHint = new URL(url).pathname + new URL(url).search;
            failuresShort.push(`${res.status} ${detail.slice(0, 100)} [${label}]`);
            lastFail = {
              status: res.status,
              body: text,
              detail,
              via: `${label} · base ${b}`,
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
              via: `${label} · base ${b}`,
            };
            failuresShort.push(`200 JSON inválido [${label}]`);
            continue;
          }
          const sessionToken = j.session_token;
          if (!sessionToken) {
            lastFail = {
              status: res.status,
              body: text,
              detail: "JSON sem session_token.",
              via: `${label} · base ${b}`,
            };
            failuresShort.push(`200 sem session_token [${label}]`);
            continue;
          }
          clearTimeout(timer);
          return { ok: true, result: { sessionToken, via: `${label} · base ${b}` } };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lastFail = {
            status: 0,
            body: "",
            detail: signal.aborted || msg.includes("abort") ? "Tempo esgotado ou requisição cancelada." : msg.slice(0, 200),
            via: `${label} · base ${b}`,
          };
          failuresShort.push(`${lastFail.detail.slice(0, 80)} [${label}]`);
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (lastFail) {
    const n = failuresShort.length;
    const norm = (s: string) => s.replace(/\s*\[[^\]]*]\s*$/, "").trim();
    const firstNorm = failuresShort[0] ? norm(failuresShort[0]) : "";
    const allSame =
      n > 0 && failuresShort.every((f) => norm(f) === firstNorm);
    const resumo =
      allSame && n > 1
        ? `${n} tentativas, mesmo resultado: ${firstNorm}`
        : failuresShort.slice(-4).join(" | ");

    const stMissing = failuresShort.join(" ").includes("SESSION_TOKEN_MISSING") || lastFail.detail.includes("SESSION_TOKEN_MISSING");
    const dica = stMissing
      ? " Esse código em initSession costuma indicar que o PHP não recebeu Authorization/App-Token (proxy web: confira HTTP_AUTHORIZATION no Apache/Nginx) ou rota errada: cadastre também a base https://SEU-DOMÍNIO/apirest.php se o GLPI publicar essa URL."
      : "";
    lastFail = {
      ...lastFail,
      detail: `${lastFail.detail} Última rota: ${lastFail.via}. ${resumo}.${dica}`,
    };
    return { ok: false, result: lastFail };
  }
  return {
    ok: false,
    result: { status: 0, body: "", detail: "Nenhuma tentativa concluída.", via: "none" },
  };
}
