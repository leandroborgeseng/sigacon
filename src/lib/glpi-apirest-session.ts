/**
 * initSession — doc GLPI REST API: Authorization user_token, App-Token opcional.
 * Tenta POST com corpo JSON vazio (como requests.post + json={}) antes de GET e query string.
 * Base pode ser …/api.php/v1, …/apirest.php ou …/api (rewrite).
 */

import {
  glpiFetch,
  glpiRedeTlsOuFirewallHint,
  glpiTlsInsecureHintParaErroDeRede,
} from "@/lib/glpi-fetch";

function timeoutMsPorTentativaInitSession(): number {
  const raw = process.env.GLPI_INIT_ATTEMPT_TIMEOUT_MS?.trim();
  if (raw && Number.isFinite(Number(raw))) {
    const n = parseInt(raw, 10);
    return Math.min(Math.max(n, 8000), 120000);
  }
  return 22000;
}

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

/** apirestBase: URL base exata em que initSession respondeu (sempre use a mesma para get/search/kill). */
export type GlpiInitSessionOk = {
  sessionToken: string;
  via: string;
  apirestBase: string;
  /** Sessão aberta sem App-Token após falha ERROR_WRONG_APP_TOKEN com token salvo (GLPI sem token de app). */
  loginSemAppToken?: boolean;
};
export type GlpiInitSessionFail = { status: number; body: string; detail: string; via: string };

type InitAttempt = { label: string; url: string; init: RequestInit };

function buildInitAttempts(base: string, appToken: string, userToken: string): InitAttempt[] {
  const attempts: InitAttempt[] = [];
  const paths = [`${base}/initSession/`, `${base}/initSession`];

  // POST primeiro — mesmo padrão de scripts com requests.post(..., json={}) + App-Token + Authorization.
  // Alguns ambientes respondem a POST e falham em GET (proxy/WAF) ou o inverso; cobrimos os dois.
  for (const url of paths) {
    attempts.push({
      label: `POST {} + Authorization user_token + App-Token (${url.endsWith("/") ? "/" : "sem /"})`,
      url,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `user_token ${userToken}`,
          ...(appToken ? { "App-Token": appToken } : {}),
        },
        body: "{}",
      },
    });
  }

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

function falhasSoWrongAppToken(falhas: string[]): boolean {
  if (!falhas.length) return false;
  return falhas.every(
    (f) =>
      f.includes("WRONG_APP_TOKEN") || f.includes("ERROR_WRONG_APP_TOKEN") || f.includes("app_token")
  );
}

export async function glpiLegacyInitSession(
  base: string,
  appToken: string,
  userToken: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ ok: true; result: GlpiInitSessionOk } | { ok: false; result: GlpiInitSessionFail }> {
  const perAttemptMs = opts?.timeoutMs ?? timeoutMsPorTentativaInitSession();

  let lastFail: GlpiInitSessionFail | null = null;
  const failuresShort: string[] = [];
  const app = sanitizarTokenGlpi(appToken);
  const user = sanitizarTokenGlpi(userToken);

  const bases = [base.replace(/\/+$/, "")];
  const fasesApp: { token: string; rotulo: string }[] =
    app !== ""
      ? [
          { token: app, rotulo: "com App-Token" },
          { token: "", rotulo: "sem App-Token (GLPI pode não exigir)" },
        ]
      : [{ token: "", rotulo: "sem App-Token" }];

  faseLoop: for (let fi = 0; fi < fasesApp.length; fi++) {
    const { token: appFase, rotulo } = fasesApp[fi];
    const falhasFase: string[] = [];

    for (const b of bases) {
      for (const { label, url, init } of buildInitAttempts(b, appFase, user)) {
        if (opts?.signal?.aborted) break faseLoop;
        const attemptAc = new AbortController();
        const attemptTimer = setTimeout(() => attemptAc.abort(), perAttemptMs);
        const outerAbort = () => attemptAc.abort();
        if (opts?.signal) {
          if (opts.signal.aborted) {
            clearTimeout(attemptTimer);
            break faseLoop;
          }
          opts.signal.addEventListener("abort", outerAbort, { once: true });
        }
        try {
          const res = await glpiFetch(url, { ...init, signal: attemptAc.signal });
          const text = await res.text();
          if (!res.ok) {
            const detail = parseGlpiApiErrorBody(text);
            falhasFase.push(`${res.status} ${detail.slice(0, 100)} [${label}]`);
            lastFail = {
              status: res.status,
              body: text,
              detail,
              via: `${label} · base ${b} (${rotulo})`,
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
              via: `${label} · base ${b} (${rotulo})`,
            };
            falhasFase.push(`200 JSON inválido [${label}]`);
            continue;
          }
          const sessionToken = j.session_token;
          if (!sessionToken) {
            lastFail = {
              status: res.status,
              body: text,
              detail: "JSON sem session_token.",
              via: `${label} · base ${b} (${rotulo})`,
            };
            falhasFase.push(`200 sem session_token [${label}]`);
            continue;
          }
          const loginSemAppToken = appFase === "" && app !== "";
          return {
            ok: true,
            result: {
              sessionToken,
              via: `${label} · base ${b} (${rotulo})`,
              apirestBase: b.replace(/\/+$/, ""),
              loginSemAppToken,
            },
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const aborted = attemptAc.signal.aborted || msg.includes("abort");
          const core = aborted ? "Tempo esgotado ou requisição cancelada." : msg.slice(0, 200);
          const detail = aborted
            ? `${core} (limite ${perAttemptMs / 1000}s por tentativa).${glpiRedeTlsOuFirewallHint()}`
            : `${core}${glpiTlsInsecureHintParaErroDeRede(msg)}`;
          lastFail = {
            status: 0,
            body: "",
            detail,
            via: `${label} · base ${b} (${rotulo})`,
          };
          falhasFase.push(`${lastFail.detail.slice(0, 80)} [${label}]`);
        } finally {
          clearTimeout(attemptTimer);
          opts?.signal?.removeEventListener("abort", outerAbort);
        }
      }
    }

    failuresShort.push(...falhasFase.map((f) => `[${rotulo}] ${f}`));

    if (fi === 0 && app !== "" && falhasSoWrongAppToken(falhasFase)) {
      continue;
    }
    break;
  }

  if (lastFail) {
    const n = failuresShort.length;
    const norm = (s: string) => s.replace(/\s*\[[^\]]*]\s*$/, "").trim();
    const firstNorm = failuresShort[0] ? norm(failuresShort[0]) : "";
    const allSame = n > 0 && failuresShort.every((f) => norm(f) === firstNorm);
    const resumo =
      allSame && n > 1
        ? `${n} tentativas, mesmo resultado: ${firstNorm}`
        : failuresShort.slice(-4).join(" | ");

    const stMissing =
      failuresShort.join(" ").includes("SESSION_TOKEN_MISSING") || lastFail.detail.includes("SESSION_TOKEN_MISSING");
    const dica = stMissing
      ? " Esse código em initSession costuma indicar que o PHP não repassou Authorization/App-Token ao GLPI (proxy: HTTP_AUTHORIZATION no Apache/Nginx) ou URL base incorreta — use exatamente …/api.php/v1 ou …/apirest.php conforme o GLPI."
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
