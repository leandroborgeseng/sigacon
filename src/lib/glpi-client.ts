/**
 * Cliente HTTP para API REST legada do GLPI (apirest.php em /api.php/v1/… ou raiz).
 * User Token + App Token: não use /api.php/v2.x/… (API alta — apenas OAuth Bearer). Ver apirest.md no GLPI.
 */

import { getGlpiCredentialsResolved } from "@/lib/glpi-config";
import { glpiLegacyInitSession, sanitizarTokenGlpi } from "@/lib/glpi-apirest-session";

export type GlpiCriterion = {
  field: number;
  searchtype: "contains" | "equals" | "notequals" | "morethan" | "lessthan" | "under" | "notunder";
  value: string | number;
  link?: "AND" | "OR" | "AND NOT" | "OR NOT";
};

export type GlpiSessionContext = {
  baseUrl: string;
  appToken: string;
  sessionToken: string;
};

/** @deprecated Use `glpiEstaConfigurado` em `@/lib/glpi-config` (async, inclui credenciais no banco). */
export function glpiEstaConfiguradoSomenteEnv(): boolean {
  const base = process.env.GLPI_URL?.replace(/\/$/, "");
  return Boolean(base && process.env.GLPI_APP_TOKEN && process.env.GLPI_USER_TOKEN);
}

export async function glpiWithSession<T>(fn: (ctx: GlpiSessionContext) => Promise<T>): Promise<T> {
  const cred = await getGlpiCredentialsResolved();
  if (!cred) {
    throw new Error(
      "GLPI não configurado (cadastre em Configuração GLPI ou defina GLPI_URL, GLPI_APP_TOKEN e GLPI_USER_TOKEN)"
    );
  }
  const { baseUrl: base, appToken, userToken } = cred;
  const initR = await glpiLegacyInitSession(base, sanitizarTokenGlpi(appToken), sanitizarTokenGlpi(userToken));
  if (!initR.ok) {
    const f = initR.result;
    throw new Error(`GLPI initSession falhou: HTTP ${f.status} ${f.detail} (${f.via})`);
  }
  const sessionToken = initR.result.sessionToken;
  const apirestBase = initR.result.apirestBase;
  const appParaSessao = initR.result.loginSemAppToken ? "" : sanitizarTokenGlpi(appToken);

  const ctx: GlpiSessionContext = { baseUrl: apirestBase, appToken: appParaSessao, sessionToken };
  try {
    return await fn(ctx);
  } finally {
    await fetch(`${apirestBase}/killSession`, {
      method: "GET",
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    }).catch(() => {});
  }
}

function headers(ctx: GlpiSessionContext) {
  const h: Record<string, string> = {
    "Session-Token": ctx.sessionToken,
    "Content-Type": "application/json",
  };
  if (ctx.appToken) h["App-Token"] = ctx.appToken;
  return h;
}

/** Resposta típica GET /Ticket/{id}?expand_dropdowns=true */
export type GlpiTicketPayload = {
  id?: number;
  name?: string;
  content?: string;
  status?: number;
  urgency?: number;
  priority?: number;
  itilcategories_id?: number | string;
  _itilcategories_id?: string;
  groups_id_assign?: number | string;
  _groups_id_assign?: string;
  users_id_assign?: number | string;
  _users_id_assign?: string;
  date?: string;
  date_mod?: string;
};

export async function glpiGetTicket(ctx: GlpiSessionContext, ticketId: number): Promise<GlpiTicketPayload> {
  const url = `${ctx.baseUrl}/Ticket/${ticketId}?expand_dropdowns=true`;
  const r = await fetch(url, { headers: headers(ctx) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI GET Ticket ${ticketId}: ${r.status} ${t.slice(0, 200)}`);
  }
  return (await r.json()) as GlpiTicketPayload;
}

export async function glpiUpdateTicket(
  ctx: GlpiSessionContext,
  ticketId: number,
  input: {
    status?: number;
    name?: string;
    content?: string;
    priority?: number;
    urgency?: number;
    itilcategories_id?: number;
    groups_id_assign?: number;
    users_id_assign?: number;
  }
): Promise<void> {
  const body: Record<string, unknown> = { input };
  const r = await fetch(`${ctx.baseUrl}/Ticket/${ticketId}`, {
    method: "PUT",
    headers: headers(ctx),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI PUT Ticket ${ticketId}: ${r.status} ${t.slice(0, 300)}`);
  }
}

/**
 * Busca tickets; retorna IDs encontrados.
 * Use listSearchOptions/Ticket no GLPI para descobrir IDs de campo (ex.: 1=título, 12=status).
 */
export async function glpiSearchTicketIds(
  ctx: GlpiSessionContext,
  criteria: GlpiCriterion[],
  range = "0-200"
): Promise<number[]> {
  const params = new URLSearchParams();
  params.set("range", range);
  // Garante que o ID do item venha na resposta do search (em muitas instalações, é o campo 2).
  params.set("forcedisplay[0]", "2");
  criteria.forEach((c, i) => {
    if (i > 0) params.set(`criteria[${i}][link]`, c.link ?? "AND");
    params.set(`criteria[${i}][field]`, String(c.field));
    params.set(`criteria[${i}][searchtype]`, c.searchtype);
    params.set(`criteria[${i}][value]`, String(c.value));
  });

  const url = `${ctx.baseUrl}/search/Ticket?${params.toString()}`;
  const r = await fetch(url, { headers: headers(ctx) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI search Ticket: ${r.status} ${t.slice(0, 400)}`);
  }
  const json = (await r.json()) as { data?: unknown[]; totalcount?: number };
  const rows = Array.isArray(json.data) ? json.data : [];
  const ids: number[] = [];
  for (const row of rows) {
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      // GLPI search costuma retornar campos por "forcedisplay" com chaves numéricas como string ("2").
      const rawForcedId = o["2"];
      const id =
        typeof o.id === "number"
          ? o.id
          : typeof o.id === "string"
            ? parseInt(o.id, 10)
            : typeof o["Ticket.id"] === "number"
              ? (o["Ticket.id"] as number)
              : typeof o["Ticket.id"] === "string"
                ? parseInt(o["Ticket.id"] as string, 10)
                : typeof rawForcedId === "number"
                  ? rawForcedId
                  : typeof rawForcedId === "string"
                    ? parseInt(rawForcedId, 10)
                    : null;
      if (id != null && !Number.isNaN(id)) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

export type GlpiGrupoLista = { id: number; name: string };

/** Lista grupos do GLPI (para vínculo com contrato). Filtra `is_assign` quando o campo existir. */
export async function glpiListAssignableGroups(ctx: GlpiSessionContext): Promise<GlpiGrupoLista[]> {
  const r = await fetch(`${ctx.baseUrl}/Group?range=0-999&sort=id`, { headers: headers(ctx) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI GET Group: ${r.status} ${t.slice(0, 300)}`);
  }
  const json = (await r.json()) as unknown;
  const raw: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown[] }).data)
      ? (json as { data: unknown[] }).data
      : [];
  const out: GlpiGrupoLista[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === "number"
        ? o.id
        : typeof o.id === "string"
          ? parseInt(o.id, 10)
          : NaN;
    if (!Number.isFinite(id)) continue;
    if (o.is_assign === 0 || o.is_assign === false) continue;
    const name =
      typeof o.completename === "string" && o.completename.trim()
        ? o.completename.trim()
        : typeof o.name === "string"
          ? o.name.trim()
          : `Grupo ${id}`;
    out.push({ id, name });
  }
  if (out.length === 0) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id =
        typeof o.id === "number"
          ? o.id
          : typeof o.id === "string"
            ? parseInt(o.id, 10)
            : NaN;
      if (!Number.isFinite(id)) continue;
      const name =
        typeof o.completename === "string" && o.completename.trim()
          ? o.completename.trim()
          : typeof o.name === "string"
            ? o.name.trim()
            : `Grupo ${id}`;
      out.push({ id, name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
