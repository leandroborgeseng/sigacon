/**
 * Cliente HTTP para API REST do GLPI (apirest.php) — compatível com GLPI 10/11.
 * Docs: https://github.com/glpi-project/glpi/blob/main/apirest.md
 */

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

function getEnv() {
  const base = process.env.GLPI_URL?.replace(/\/$/, "");
  const appToken = process.env.GLPI_APP_TOKEN;
  const userToken = process.env.GLPI_USER_TOKEN;
  return { base, appToken, userToken };
}

export function glpiEstaConfigurado(): boolean {
  const { base, appToken, userToken } = getEnv();
  return Boolean(base && appToken && userToken);
}

export async function glpiWithSession<T>(fn: (ctx: GlpiSessionContext) => Promise<T>): Promise<T> {
  const { base, appToken, userToken } = getEnv();
  if (!base || !appToken || !userToken) {
    throw new Error("GLPI não configurado (GLPI_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN)");
  }
  const init = await fetch(`${base}/initSession`, {
    method: "GET",
    headers: {
      "App-Token": appToken,
      Authorization: `user_token ${userToken}`,
    },
  });
  if (!init.ok) {
    const t = await init.text();
    throw new Error(`GLPI initSession falhou: ${init.status} ${t.slice(0, 300)}`);
  }
  const j = (await init.json()) as { session_token?: string };
  const sessionToken = j.session_token;
  if (!sessionToken) throw new Error("GLPI retornou session_token vazio");

  const ctx: GlpiSessionContext = { baseUrl: base, appToken, sessionToken };
  try {
    return await fn(ctx);
  } finally {
    await fetch(`${base}/killSession`, {
      method: "GET",
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    }).catch(() => {});
  }
}

function headers(ctx: GlpiSessionContext) {
  return {
    "App-Token": ctx.appToken,
    "Session-Token": ctx.sessionToken,
    "Content-Type": "application/json",
  };
}

/** Resposta típica GET /Ticket/{id}?expand_dropdowns=true */
export type GlpiTicketPayload = {
  id?: number;
  name?: string;
  content?: string;
  status?: number;
  urgency?: number;
  priority?: number;
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
  input: { status?: number; name?: string; content?: string }
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
      const id =
        typeof o.id === "number"
          ? o.id
          : typeof o.id === "string"
            ? parseInt(o.id, 10)
            : typeof o["Ticket.id"] === "number"
              ? (o["Ticket.id"] as number)
              : null;
      if (id != null && !Number.isNaN(id)) ids.push(id);
    }
  }
  return [...new Set(ids)];
}
