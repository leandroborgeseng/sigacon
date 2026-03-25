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

export type GlpiFollowupPayload = {
  id?: number;
  items_id?: number | string;
  itemtype?: string;
  content?: string;
  date?: string;
  date_mod?: string;
  is_private?: number | boolean;
  users_id?: number | string;
  _users_id?: string;
};

export type GlpiTaskPayload = {
  id?: number;
  items_id?: number | string;
  itemtype?: string;
  content?: string;
  date?: string;
  date_mod?: string;
  is_private?: number | boolean;
  users_id?: number | string;
  _users_id?: string;
  state?: number | string;
};

export type GlpiSolutionPayload = {
  id?: number;
  items_id?: number | string;
  itemtype?: string;
  content?: string;
  date_creation?: string;
  date_mod?: string;
  users_id?: number | string;
  _users_id?: string;
  status?: number | string;
};

export type GlpiDocumentItemPayload = {
  id?: number;
  items_id?: number | string;
  itemtype?: string;
  documents_id?: number | string;
  date_mod?: string;
  date_creation?: string;
};

export type GlpiDocumentPayload = {
  id?: number;
  name?: string;
  filename?: string;
  filepath?: string;
  mime?: string;
  link?: string;
  date_mod?: string;
  date_creation?: string;
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

async function fetchJsonOrThrow(r: Response, context: string) {
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`${context}: ${r.status} ${t.slice(0, 400)}`);
  }
  return (await r.json()) as unknown;
}

function parseId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function listNestedOrNull<T>(ctx: GlpiSessionContext, url: string): Promise<T[] | null> {
  const r = await fetch(url, { headers: headers(ctx) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  if (Array.isArray(j)) return j as T[];
  if (j && typeof j === "object" && "data" in (j as Record<string, unknown>)) {
    const data = (j as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

/**
 * Lista followups (comentários) do ticket.
 * Tenta primeiro a rota aninhada (quando disponível) e cai para search/ITILFollowup como fallback.
 */
export async function glpiListTicketFollowups(
  ctx: GlpiSessionContext,
  ticketId: number
): Promise<GlpiFollowupPayload[]> {
  const nested = await listNestedOrNull<GlpiFollowupPayload>(
    ctx,
    `${ctx.baseUrl}/Ticket/${ticketId}/ITILFollowup?range=0-200&sort=date&order=ASC&expand_dropdowns=true`
  );
  if (nested) return nested;

  // Fallback: search/ITILFollowup com critérios comuns
  const params = new URLSearchParams();
  params.set("range", "0-200");
  params.set("forcedisplay[0]", "2"); // id
  // Campo 4 costuma ser items_id e 5 itemtype em várias instalações, mas pode variar.
  // Mantemos apenas o filtro por items_id e itemtype; se não funcionar, o usuário ajusta via listSearchOptions.
  params.set("criteria[0][field]", "4");
  params.set("criteria[0][searchtype]", "equals");
  params.set("criteria[0][value]", String(ticketId));
  params.set("criteria[1][link]", "AND");
  params.set("criteria[1][field]", "5");
  params.set("criteria[1][searchtype]", "equals");
  params.set("criteria[1][value]", "Ticket");

  const url = `${ctx.baseUrl}/search/ITILFollowup?${params.toString()}`;
  const r = await fetch(url, { headers: headers(ctx) });
  const json = (await fetchJsonOrThrow(r, "GLPI search ITILFollowup")) as {
    data?: unknown[];
  };
  const rows = Array.isArray(json.data) ? json.data : [];
  const ids: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const raw = o.id ?? o["2"] ?? o["ITILFollowup.id"];
    const id = parseId(raw);
    if (id != null) ids.push(id);
  }
  const out: GlpiFollowupPayload[] = [];
  for (const id of [...new Set(ids)]) {
    const fr = await fetch(`${ctx.baseUrl}/ITILFollowup/${id}?expand_dropdowns=true`, { headers: headers(ctx) });
    const fj = (await fetchJsonOrThrow(fr, `GLPI GET ITILFollowup ${id}`)) as GlpiFollowupPayload;
    out.push(fj);
  }
  return out.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export async function glpiCreateTicketFollowup(
  ctx: GlpiSessionContext,
  ticketId: number,
  input: { content: string; privado?: boolean }
): Promise<{ id?: number }> {
  const body = {
    input: {
      itemtype: "Ticket",
      items_id: ticketId,
      content: input.content,
      is_private: input.privado ? 1 : 0,
    },
  };
  const r = await fetch(`${ctx.baseUrl}/ITILFollowup`, {
    method: "POST",
    headers: headers(ctx),
    body: JSON.stringify(body),
  });
  const j = (await fetchJsonOrThrow(r, "GLPI POST ITILFollowup")) as { id?: number };
  return { id: j.id };
}

export async function glpiListTicketTasks(ctx: GlpiSessionContext, ticketId: number): Promise<GlpiTaskPayload[]> {
  const nested = await listNestedOrNull<GlpiTaskPayload>(
    ctx,
    `${ctx.baseUrl}/Ticket/${ticketId}/ITILTask?range=0-200&sort=date&order=ASC&expand_dropdowns=true`
  );
  if (nested) return nested;

  const params = new URLSearchParams();
  params.set("range", "0-200");
  params.set("forcedisplay[0]", "2"); // id
  params.set("criteria[0][field]", "4");
  params.set("criteria[0][searchtype]", "equals");
  params.set("criteria[0][value]", String(ticketId));
  params.set("criteria[1][link]", "AND");
  params.set("criteria[1][field]", "5");
  params.set("criteria[1][searchtype]", "equals");
  params.set("criteria[1][value]", "Ticket");
  const url = `${ctx.baseUrl}/search/ITILTask?${params.toString()}`;
  const r = await fetch(url, { headers: headers(ctx) });
  const json = (await fetchJsonOrThrow(r, "GLPI search ITILTask")) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const ids: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = parseId(o.id ?? o["2"] ?? o["ITILTask.id"]);
    if (id != null) ids.push(id);
  }
  const out: GlpiTaskPayload[] = [];
  for (const id of [...new Set(ids)]) {
    const tr = await fetch(`${ctx.baseUrl}/ITILTask/${id}?expand_dropdowns=true`, { headers: headers(ctx) });
    const tj = (await fetchJsonOrThrow(tr, `GLPI GET ITILTask ${id}`)) as GlpiTaskPayload;
    out.push(tj);
  }
  return out.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

export async function glpiCreateTicketTask(
  ctx: GlpiSessionContext,
  ticketId: number,
  input: { content: string; privado?: boolean }
): Promise<{ id?: number }> {
  const body = {
    input: {
      itemtype: "Ticket",
      items_id: ticketId,
      content: input.content,
      is_private: input.privado ? 1 : 0,
    },
  };
  const r = await fetch(`${ctx.baseUrl}/ITILTask`, {
    method: "POST",
    headers: headers(ctx),
    body: JSON.stringify(body),
  });
  const j = (await fetchJsonOrThrow(r, "GLPI POST ITILTask")) as { id?: number };
  return { id: j.id };
}

export async function glpiListTicketSolutions(
  ctx: GlpiSessionContext,
  ticketId: number
): Promise<GlpiSolutionPayload[]> {
  const nested = await listNestedOrNull<GlpiSolutionPayload>(
    ctx,
    `${ctx.baseUrl}/Ticket/${ticketId}/ITILSolution?range=0-50&sort=date_creation&order=ASC&expand_dropdowns=true`
  );
  if (nested) return nested;

  const params = new URLSearchParams();
  params.set("range", "0-50");
  params.set("forcedisplay[0]", "2"); // id
  params.set("criteria[0][field]", "4");
  params.set("criteria[0][searchtype]", "equals");
  params.set("criteria[0][value]", String(ticketId));
  params.set("criteria[1][link]", "AND");
  params.set("criteria[1][field]", "5");
  params.set("criteria[1][searchtype]", "equals");
  params.set("criteria[1][value]", "Ticket");
  const url = `${ctx.baseUrl}/search/ITILSolution?${params.toString()}`;
  const r = await fetch(url, { headers: headers(ctx) });
  const json = (await fetchJsonOrThrow(r, "GLPI search ITILSolution")) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const ids: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = parseId(o.id ?? o["2"] ?? o["ITILSolution.id"]);
    if (id != null) ids.push(id);
  }
  const out: GlpiSolutionPayload[] = [];
  for (const id of [...new Set(ids)]) {
    const sr = await fetch(`${ctx.baseUrl}/ITILSolution/${id}?expand_dropdowns=true`, { headers: headers(ctx) });
    const sj = (await fetchJsonOrThrow(sr, `GLPI GET ITILSolution ${id}`)) as GlpiSolutionPayload;
    out.push(sj);
  }
  return out.sort((a, b) => (a.date_creation ?? "").localeCompare(b.date_creation ?? ""));
}

export async function glpiCreateTicketSolution(
  ctx: GlpiSessionContext,
  ticketId: number,
  input: { content: string }
): Promise<{ id?: number }> {
  const body = {
    input: {
      itemtype: "Ticket",
      items_id: ticketId,
      content: input.content,
    },
  };
  const r = await fetch(`${ctx.baseUrl}/ITILSolution`, {
    method: "POST",
    headers: headers(ctx),
    body: JSON.stringify(body),
  });
  const j = (await fetchJsonOrThrow(r, "GLPI POST ITILSolution")) as { id?: number };
  return { id: j.id };
}

export async function glpiListTicketDocuments(
  ctx: GlpiSessionContext,
  ticketId: number
): Promise<Array<{ linkId?: number; documentId: number; name: string; link?: string }>> {
  const nested = await listNestedOrNull<GlpiDocumentPayload>(
    ctx,
    `${ctx.baseUrl}/Ticket/${ticketId}/Document?range=0-200&sort=id&order=ASC`
  );
  if (nested) {
    const docs = nested
      .map((d) => ({
        documentId: parseId(d.id) ?? NaN,
        name: (d.name ?? d.filename ?? "").trim() || `Documento`,
        link: typeof d.link === "string" ? d.link : undefined,
      }))
      .filter((d) => Number.isFinite(d.documentId));
    return docs;
  }

  // Fallback: Document_Item (links) -> Document
  const params = new URLSearchParams();
  params.set("range", "0-200");
  params.set("forcedisplay[0]", "2"); // id
  params.set("forcedisplay[1]", "7"); // documents_id (comum)
  params.set("criteria[0][field]", "4"); // items_id (comum)
  params.set("criteria[0][searchtype]", "equals");
  params.set("criteria[0][value]", String(ticketId));
  params.set("criteria[1][link]", "AND");
  params.set("criteria[1][field]", "5"); // itemtype (comum)
  params.set("criteria[1][searchtype]", "equals");
  params.set("criteria[1][value]", "Ticket");

  const url = `${ctx.baseUrl}/search/Document_Item?${params.toString()}`;
  const r = await fetch(url, { headers: headers(ctx) });
  const json = (await fetchJsonOrThrow(r, "GLPI search Document_Item")) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const links: Array<{ linkId?: number; documentId: number }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const linkId = parseId(o.id ?? o["2"] ?? o["Document_Item.id"]) ?? undefined;
    const docId = parseId(o.documents_id ?? o["7"] ?? o["Document_Item.documents_id"]);
    if (docId != null) links.push({ linkId, documentId: docId });
  }
  const uniqDocs = [...new Map(links.map((l) => [l.documentId, l])).values()];
  const out: Array<{ linkId?: number; documentId: number; name: string; link?: string }> = [];
  for (const l of uniqDocs) {
    const dr = await fetch(`${ctx.baseUrl}/Document/${l.documentId}`, { headers: headers(ctx) });
    const dj = (await fetchJsonOrThrow(dr, `GLPI GET Document ${l.documentId}`)) as GlpiDocumentPayload;
    out.push({
      linkId: l.linkId,
      documentId: l.documentId,
      name: (dj.name ?? dj.filename ?? "").trim() || `Documento #${l.documentId}`,
      link: typeof dj.link === "string" ? dj.link : undefined,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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

export type GlpiCategoriaLista = { id: number; name: string };

/** Lista categorias ITIL do GLPI (para edição/visualização). */
export async function glpiListItilCategories(ctx: GlpiSessionContext): Promise<GlpiCategoriaLista[]> {
  const r = await fetch(`${ctx.baseUrl}/ITILCategory?range=0-999&sort=id`, { headers: headers(ctx) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI GET ITILCategory: ${r.status} ${t.slice(0, 300)}`);
  }
  const json = (await r.json()) as unknown;
  const raw: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown[] }).data)
      ? (json as { data: unknown[] }).data
      : [];
  const out: GlpiCategoriaLista[] = [];
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
          : `Categoria ${id}`;
    out.push({ id, name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export type GlpiUsuarioLista = { id: number; name: string };

/** Lista usuários do GLPI (para atribuição). */
export async function glpiListUsers(ctx: GlpiSessionContext): Promise<GlpiUsuarioLista[]> {
  const r = await fetch(`${ctx.baseUrl}/User?range=0-999&sort=id`, { headers: headers(ctx) });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GLPI GET User: ${r.status} ${t.slice(0, 300)}`);
  }
  const json = (await r.json()) as unknown;
  const raw: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown[] }).data)
      ? (json as { data: unknown[] }).data
      : [];
  const out: GlpiUsuarioLista[] = [];
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
      typeof o.name === "string" && o.name.trim()
        ? o.name.trim()
        : typeof o.realname === "string" && o.realname.trim()
          ? `${o.realname}${typeof o.firstname === "string" && o.firstname.trim() ? ` ${o.firstname}` : ""}`.trim()
          : `Usuário ${id}`;
    out.push({ id, name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
