/**
 * Validação só de formato de URL da API GLPI (browser-safe; sem fetch/TLS).
 */

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Bases válidas (manual GLPI + instalações comuns):
 * - …/apirest.php (entrada direta do script)
 * - …/api.php/v1 (URL “v1” exibida na doc / painel)
 * - …/api (Apache/Nginx: rewrite api/(.*) → apirest.php/$1)
 */
function caminhoBaseApiGlpiValido(pathnameRaw: string): boolean {
  const path = pathnameRaw.replace(/\/+$/, "") || "/";
  if (/\/apirest\.php$/i.test(path)) return true;
  if (/\/api\.php\/v1$/i.test(path)) return true;
  if (/\/api$/i.test(path)) return true;
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
      message:
        "Informe a URL base da API REST GLPI (ex.: https://servidor/glpi/api.php/v1, https://servidor/glpi/apirest.php ou https://servidor/glpi/api se o servidor usar rewrite).",
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
        "Use a base publicada pelo seu GLPI: …/api.php/v1, …/apirest.php ou …/api (com rewrite), como na documentação oficial da REST API.",
    };
  }
  if (/\/api\.php\/v(?!1\b)/i.test(parsedUrl.pathname)) {
    return {
      ok: false,
      message:
        "Caminhos /api.php/v2 ou superiores não são esta REST legada (user_token + Session-Token). Use …/api.php/v1, …/apirest.php ou …/api conforme o manual GLPI.",
    };
  }
  return { ok: true, normalized: base };
}
