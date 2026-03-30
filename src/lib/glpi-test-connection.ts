/**
 * Testes de conectividade contra a REST v1 (GET initSession em …/api.php/v1 ou …/apirest.php).
 * Ver https://github.com/glpi-project/glpi/blob/main/apirest.md
 */

import { glpiLegacyInitSession, parseGlpiApiErrorBody } from "@/lib/glpi-apirest-session";
import { glpiFetch, glpiTlsInsecureHintParaErroDeRede } from "@/lib/glpi-fetch";

export type GlpiTestStep = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Base REST aceita (doc GLPI): …/apirest.php ou …/api.php/v1 — em ambos os casos o app chama …/initSession na mesma base.
 */
function caminhoBaseApiGlpiValido(pathnameRaw: string): boolean {
  const path = pathnameRaw.replace(/\/+$/, "") || "/";
  if (/\/apirest\.php$/i.test(path)) return true;
  if (/\/api\.php\/v1$/i.test(path)) return true;
  return false;
}

/** User Token + App Token (GET initSession). Não há API OAuth /api.php/v2+ nesta integração. */
export function validarFormatoUrlApiGlpi(
  raw: string
): { ok: true; normalized: string } | { ok: false; message: string } {
  const base = normalizeBaseUrl(raw);
  if (!base) {
    return {
      ok: false,
      message: "Informe a URL base da API REST (ex.: https://servidor/api.php/v1 ou https://servidor/apirest.php).",
    };
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(base);
  } catch {
    return { ok: false, message: "Formato de URL inválido." };
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { ok: false, message: "Use http:// ou https://." };
  }
  if (!caminhoBaseApiGlpiValido(parsedUrl.pathname)) {
    return {
      ok: false,
      message:
        "Use a base REST v1 do GLPI: URL terminando em /api.php/v1 (ex.: https://suporte.prefeitura.gov.br/api.php/v1) ou em /apirest.php, conforme a instalação.",
    };
  }
  if (/\/api\.php\/v(?!1\b)/i.test(parsedUrl.pathname)) {
    return {
      ok: false,
      message:
        "Caminhos /api.php/v2 ou superiores usam outra API (OAuth2). Esta integração usa só a REST v1 (…/api.php/v1 ou …/apirest.php) com User Token e App Token.",
    };
  }
  return { ok: true, normalized: base };
}

/**
 * Verifica se o host responde em initSession (sem credenciais: costuma ser 400/401, o que já prova alcance).
 */
export async function pingGlpiApiEndpoint(rawUrl: string): Promise<{ ok: boolean; detail: string }> {
  const v = validarFormatoUrlApiGlpi(rawUrl);
  if (!v.ok) return { ok: false, detail: v.message };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const r = await glpiFetch(`${v.normalized}/initSession`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(t);
    return {
      ok: true,
      detail: `Servidor GLPI respondeu (HTTP ${r.status}). Credenciais ainda não foram testadas.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort")) {
      return { ok: false, detail: "Tempo esgotado ao contatar a URL." };
    }
    return {
      ok: false,
      detail: `Não foi possível alcançar a URL: ${msg.slice(0, 180)}${glpiTlsInsecureHintParaErroDeRede(msg)}`,
    };
  }
}

export type GlpiTestInput = {
  baseUrl: string;
  appToken: string;
  userToken: string;
};

/**
 * initSession, getFullSession, killSession — sem teste de search/Ticket nesta tela.
 */
export async function testarConexaoGlpi(input: GlpiTestInput): Promise<{
  ok: boolean;
  steps: GlpiTestStep[];
  /** Salvar com app_token nulo (sessão GLPI aberta só com User Token). */
  persistirAppTokenVazio?: boolean;
}> {
  const steps: GlpiTestStep[] = [];
  const urlV = validarFormatoUrlApiGlpi(input.baseUrl);
  if (!urlV.ok) {
    steps.push({
      id: "url",
      label: "URL da API GLPI",
      ok: false,
      detail: urlV.message,
    });
    return { ok: false, steps };
  }
  const base = urlV.normalized;
  steps.push({ id: "url", label: "URL base da API GLPI (REST v1)", ok: true, detail: base });

  const userToken = input.userToken.trim();
  const appToken = input.appToken.trim();

  if (!userToken) {
    steps.push({
      id: "userToken",
      label: "User Token",
      ok: false,
      detail: "Obrigatório: em GLPI, preferências do usuário → “Chave de acesso remoto”.",
    });
    return { ok: false, steps };
  }

  steps.push({
    id: "userToken",
    label: "User Token",
    ok: true,
    detail: `${userToken.length} caracteres — conferir no painel debug abaixo.`,
  });

  if (!appToken) {
    steps.push({
      id: "appToken",
      label: "App Token",
      ok: true,
      detail: "Vazio neste teste — obrigatório só se o GLPI tiver App-Token em Configuração → API.",
    });
  } else {
    steps.push({
      id: "appToken",
      label: "App Token",
      ok: true,
      detail: `${appToken.length} caracteres — conferir no painel debug abaixo.`,
    });
  }

  let sessionToken: string | null = null;
  const initR = await glpiLegacyInitSession(base, appToken, userToken, { timeoutMs: 22000 });
  if (!initR.ok) {
    const f = initR.result;
    let dica = "";
    if (f.detail.includes("ERROR_WRONG_APP_TOKEN_PARAMETER")) {
      dica =
        " Ação: no GLPI abra Configuração → Geral → aba API, copie o ‘Token da aplicação’ (ou gere outro e salve no GLPI). Se nesse painel o App-Token estiver vazio, deixe App Token em branco no SIGACON também. Valor antigo, espaço invisível ou token de outro ambiente geram este erro.";
    } else if (f.detail.includes("ERROR_WRONG_USER_TOKEN_PARAMETER") || f.detail.includes("user token")) {
      dica =
        " Ação: no usuário do GLPI (Preferências / chave de acesso remoto) gere ou copie o User Token e atualize aqui.";
    }
    steps.push({
      id: "initSession",
      label: "Autenticação (initSession)",
      ok: false,
      detail: `HTTP ${f.status}: ${f.detail}${dica}`,
    });
    return { ok: false, steps };
  }
  sessionToken = initR.result.sessionToken;
  const apirestBase = initR.result.apirestBase;
  const loginSemApp = Boolean(initR.result.loginSemAppToken);
  const appHeaderParaSessao = loginSemApp ? "" : appToken;
  steps.push({
    id: "initSession",
    label: "Autenticação (initSession)",
    ok: true,
    detail: `Sessão criada (${initR.result.via}).${
      apirestBase !== base ? ` As próximas chamadas usam a mesma base: ${apirestBase}.` : ""
    }${
      loginSemApp
        ? " O GLPI aceitou só o User Token — ao salvar, o App Token será removido da configuração."
        : ""
    }`,
  });

  const sessionHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Session-Token": sessionToken,
  };
  if (appHeaderParaSessao) sessionHeaders["App-Token"] = appHeaderParaSessao;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const full = await glpiFetch(`${apirestBase}/getFullSession`, {
      method: "GET",
      headers: sessionHeaders,
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!full.ok) {
      const tx = await full.text();
      steps.push({
        id: "getFullSession",
        label: "Sessão ativa (getFullSession)",
        ok: false,
        detail: `HTTP ${full.status}: ${parseGlpiApiErrorBody(tx)}`,
      });
    } else {
      steps.push({
        id: "getFullSession",
        label: "Sessão ativa (getFullSession)",
        ok: true,
        detail: "API responde com dados de sessão.",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    steps.push({
      id: "getFullSession",
      label: "Sessão ativa (getFullSession)",
      ok: false,
      detail: msg.slice(0, 200),
    });
  }

  try {
    const kh = new Headers(sessionHeaders);
    await glpiFetch(`${apirestBase}/killSession`, { method: "GET", headers: kh });
    steps.push({ id: "killSession", label: "Encerramento (killSession)", ok: true, detail: "Sessão de teste encerrada." });
  } catch {
    steps.push({
      id: "killSession",
      label: "Encerramento (killSession)",
      ok: false,
      detail: "Não foi possível encerrar a sessão (pode expirar sozinha).",
    });
  }

  const ok = steps.filter((s) => s.id !== "killSession").every((s) => s.ok);
  return { ok, steps, persistirAppTokenVazio: ok && loginSemApp };
}
