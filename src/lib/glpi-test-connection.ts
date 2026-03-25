/**
 * Testes de conectividade contra a API REST do GLPI (apirest.php).
 * Autenticação: App-Token (cabeçalho) + User Token (Authorization: user_token …),
 * conforme https://github.com/glpi-project/glpi/blob/main/apirest.md
 * Compatível com GLPI 10/11; o número de versão “2.2” costuma referir-se a módulos/plugins — o fluxo REST padrão é o acima.
 */

export type GlpiTestStep = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

function parseGlpiErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as unknown;
    if (Array.isArray(j) && typeof j[0] === "string") return j[0];
    if (j && typeof j === "object") {
      if ("message" in j) return String((j as { message: unknown }).message);
      const o = j as { title?: unknown; detail?: unknown };
      if (typeof o.title === "string" || typeof o.detail === "string") {
        return [o.title, o.detail].filter((x): x is string => typeof x === "string").join(": ");
      }
    }
  } catch {
    /* ignore */
  }
  return text.slice(0, 280);
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Validação só de formato (cliente ou servidor), sem rede. */
export function validarFormatoUrlApiGlpi(
  raw: string
): { ok: true; normalized: string } | { ok: false; message: string } {
  const base = normalizeBaseUrl(raw);
  if (!base) return { ok: false, message: "Digite a URL completa até apirest.php." };
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(base);
  } catch {
    return { ok: false, message: "Formato de URL inválido." };
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { ok: false, message: "Use http:// ou https://." };
  }
  const pathOk = /apirest\.php$/i.test(parsedUrl.pathname.replace(/\/$/, ""));
  if (!pathOk) {
    return { ok: false, message: "O caminho deve terminar em …/apirest.php." };
  }
  return { ok: true, normalized: base };
}

/** API “high-level” (v2+): OAuth Bearer. Esta integração usa User/App Token só na rota legada (v1). */
export function urlApontaParaApiAltaNivelGlpi(normalizedUrl: string): boolean {
  try {
    const p = new URL(normalizedUrl).pathname;
    return /\/api\.php\/v(?!1\b)/i.test(p) && /apirest\.php$/i.test(p);
  } catch {
    return false;
  }
}

/** Troca …/api.php/v2.x/… por …/api.php/v1/… para usar initSession com user_token. */
export function sugerirUrlApiLegadaGlpi(normalizedUrl: string): string | null {
  if (!urlApontaParaApiAltaNivelGlpi(normalizedUrl)) return null;
  try {
    const u = new URL(normalizedUrl);
    u.pathname = u.pathname.replace(/\/api\.php\/v[^/]+/i, "/api.php/v1");
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
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
    const r = await fetch(`${v.normalized}/initSession`, {
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
    return { ok: false, detail: `Não foi possível alcançar a URL: ${msg.slice(0, 180)}` };
  }
}

export type GlpiTestInput = {
  baseUrl: string;
  appToken: string;
  userToken: string;
  campoBuscaGrupoTecnico: number;
  criteriosExtraJson: string | null;
};

/**
 * Executa initSession, chamada de leitura mínima, validação opcional de campo de busca e critérios JSON.
 * Sempre encerra com killSession.
 */
export async function testarConexaoGlpi(input: GlpiTestInput): Promise<{
  ok: boolean;
  steps: GlpiTestStep[];
}> {
  const steps: GlpiTestStep[] = [];
  const urlV = validarFormatoUrlApiGlpi(input.baseUrl);
  if (!urlV.ok) {
    steps.push({
      id: "url",
      label: "URL da API (apirest.php)",
      ok: false,
      detail: urlV.message,
    });
    return { ok: false, steps };
  }
  const base = urlV.normalized;
  steps.push({ id: "url", label: "URL da API (apirest.php)", ok: true, detail: base });

  if (urlApontaParaApiAltaNivelGlpi(base)) {
    const legado = sugerirUrlApiLegadaGlpi(base);
    steps.push({
      id: "urlApiVersao",
      label: "URL: API legada (v1) para User Token",
      ok: false,
      detail: `Este caminho é da API de alto nível (v2+), que usa OAuth2 (Bearer JWT), não User/App Token. Troque para a API legada em v1 — ex.: ${legado ?? "…/api.php/v1/apirest.php"}. Documentação: help.glpi-project.org (RESTful API V2 / version pinning).`,
    });
    return { ok: false, steps };
  }

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
    detail: "Preenchido (validação na autenticação abaixo).",
  });

  if (!appToken) {
    steps.push({
      id: "appToken",
      label: "App Token",
      ok: true,
      detail:
        "Não preenchido. Obrigatório apenas se em GLPI (Configuração → Geral → API) houver App-Token definido.",
    });
  } else {
    steps.push({ id: "appToken", label: "App Token", ok: true, detail: "Preenchido." });
  }

  const jsonExtra = input.criteriosExtraJson?.trim() ?? "";
  if (jsonExtra) {
    try {
      const arr = JSON.parse(jsonExtra) as unknown;
      if (!Array.isArray(arr)) {
        steps.push({
          id: "criteriosJson",
          label: "Critérios extras (JSON)",
          ok: false,
          detail: "Deve ser um array JSON de critérios.",
        });
        return { ok: false, steps };
      }
      steps.push({
        id: "criteriosJson",
        label: "Critérios extras (JSON)",
        ok: true,
        detail: `${arr.length} critério(s) no array.`,
      });
    } catch {
      steps.push({
        id: "criteriosJson",
        label: "Critérios extras (JSON)",
        ok: false,
        detail: "JSON inválido (não foi possível interpretar).",
      });
      return { ok: false, steps };
    }
  } else {
    steps.push({ id: "criteriosJson", label: "Critérios extras (JSON)", ok: true, detail: "Vazio (ok)." });
  }

  const campo = Number.isFinite(input.campoBuscaGrupoTecnico)
    ? Math.floor(input.campoBuscaGrupoTecnico)
    : 71;
  if (campo < 1) {
    steps.push({
      id: "campoBusca",
      label: "Campo busca (grupo técnico)",
      ok: false,
      detail: "Use um número inteiro ≥ 1 (ID do campo em search/Ticket).",
    });
    return { ok: false, steps };
  }

  const initHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `user_token ${userToken}`,
  };
  if (appToken) initHeaders["App-Token"] = appToken;

  let sessionToken: string | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const init = await fetch(`${base}/initSession`, {
      method: "GET",
      headers: initHeaders,
      signal: controller.signal,
    });
    clearTimeout(t);
    const text = await init.text();
    if (!init.ok) {
      steps.push({
        id: "initSession",
        label: "Autenticação (initSession)",
        ok: false,
        detail: `HTTP ${init.status}: ${parseGlpiErrorBody(text)}`,
      });
      return { ok: false, steps };
    }
    let j: { session_token?: string };
    try {
      j = JSON.parse(text) as { session_token?: string };
    } catch {
      steps.push({
        id: "initSession",
        label: "Autenticação (initSession)",
        ok: false,
        detail: "Resposta não é JSON válido.",
      });
      return { ok: false, steps };
    }
    sessionToken = j.session_token ?? null;
    if (!sessionToken) {
      steps.push({
        id: "initSession",
        label: "Autenticação (initSession)",
        ok: false,
        detail: "Resposta sem session_token.",
      });
      return { ok: false, steps };
    }
    steps.push({
      id: "initSession",
      label: "Autenticação (initSession)",
      ok: true,
      detail: "Sessão REST criada com sucesso.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    steps.push({
      id: "initSession",
      label: "Autenticação (initSession)",
      ok: false,
      detail: msg.includes("abort") ? "Tempo esgotado ao contatar o GLPI." : msg.slice(0, 200),
    });
    return { ok: false, steps };
  }

  const sessionHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Session-Token": sessionToken,
  };
  if (appToken) sessionHeaders["App-Token"] = appToken;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const full = await fetch(`${base}/getFullSession`, {
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
        detail: `HTTP ${full.status}: ${parseGlpiErrorBody(tx)}`,
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
    const params = new URLSearchParams();
    params.set("range", "0-0");
    params.set("criteria[0][field]", String(campo));
    params.set("criteria[0][searchtype]", "equals");
    params.set("criteria[0][value]", "0");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const sr = await fetch(`${base}/search/Ticket?${params.toString()}`, {
      method: "GET",
      headers: sessionHeaders,
      signal: controller.signal,
    });
    clearTimeout(t);
    const st = await sr.text();
    if (!sr.ok) {
      steps.push({
        id: "campoBusca",
        label: `Campo ${campo} em search/Ticket`,
        ok: false,
        detail: `HTTP ${sr.status}: ${parseGlpiErrorBody(st)} — ajuste o ID em listSearchOptions/Ticket no GLPI.`,
      });
    } else {
      steps.push({
        id: "campoBusca",
        label: `Campo ${campo} em search/Ticket`,
        ok: true,
        detail: "Busca aceita este ID de campo (teste com valor fictício).",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    steps.push({
      id: "campoBusca",
      label: `Campo ${campo} em search/Ticket`,
      ok: false,
      detail: msg.slice(0, 200),
    });
  }

  try {
    const kh = new Headers(sessionHeaders);
    await fetch(`${base}/killSession`, { method: "GET", headers: kh });
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
  return { ok, steps };
}
