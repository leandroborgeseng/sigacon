/**
 * HTTP(s) para o GLPI no servidor Node (Railway, Docker).
 * curl no seu Mac pode funcionar enquanto o app falha: TLS com cadeia incompleta e/ou IPv6.
 * HTTPS do GLPI usa Undici + lookup IPv4 explícito — o fetch global do Node nem sempre aplica setDefaultResultOrder.
 */

import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

const forceIpv4Env = process.env.GLPI_FORCE_IPV4?.trim().toLowerCase();
const ipv4First =
  forceIpv4Env == null
    ? true
    : forceIpv4Env === "1" || forceIpv4Env === "true" || forceIpv4Env === "yes";

if (ipv4First && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/** Lookup só IPv4 — reduz falhas “fetch failed” quando o provedor cloud escolhe IPv6 e o GLPI não responde. */
function lookupIpv4Only(
  hostname: string,
  _opts: object,
  cb: (err: NodeJS.ErrnoException | null, address: string, family?: number) => void
): void {
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (err) {
      cb(err, "", undefined);
      return;
    }
    cb(null, address, family);
  });
}

function connectOptsBase(): { rejectUnauthorized: boolean; lookup?: typeof lookupIpv4Only } {
  return {
    rejectUnauthorized: true,
    ...(ipv4First ? { lookup: lookupIpv4Only } : {}),
  };
}

/** true se GLPI_TLS_INSECURE está ativo (1/true/yes). */
export function glpiTlsInsecureEnabled(): boolean {
  const v = process.env.GLPI_TLS_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let tlsStrictAgent: Agent | null = null;
let tlsInsecureAgent: Agent | null = null;

function getTlsStrictAgent(): Agent {
  if (!tlsStrictAgent) {
    tlsStrictAgent = new Agent({
      connect: connectOptsBase(),
    });
  }
  return tlsStrictAgent;
}

function getTlsInsecureAgent(): Agent {
  if (!tlsInsecureAgent) {
    tlsInsecureAgent = new Agent({
      connect: {
        rejectUnauthorized: false,
        ...(ipv4First ? { lookup: lookupIpv4Only } : {}),
      },
    });
  }
  return tlsInsecureAgent;
}

function requestUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

function errorMessageWithCause(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  let out = err.message || String(err);
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    out += ` | cause: ${cause.message}${code ? ` (code: ${code})` : ""}`;
  }
  return out;
}

async function undiciGlpiHttps(url: string, init: RequestInit | undefined, dispatcher: Agent): Promise<Response> {
  const res = await undiciFetch(url, {
    ...(init ?? {}),
    dispatcher,
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}

/**
 * fetch para o GLPI.
 * - HTTPS: sempre Undici (TLS + IPv4 explícito quando ativo).
 * - GLPI_TLS_INSECURE=1: TLS como curl -k via Agent (sem NODE_TLS_REJECT_UNAUTHORIZED global).
 * - GLPI_FORCE_IPV4=0: desliga lookup só IPv4 (default no código é priorizar IPv4).
 */
export async function glpiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrlString(input);
  if (!url.startsWith("https://")) {
    return fetch(input, init);
  }

  if (glpiTlsInsecureEnabled()) {
    return undiciGlpiHttps(url, init, getTlsInsecureAgent());
  }

  try {
    return await undiciGlpiHttps(url, init, getTlsStrictAgent());
  } catch (strictError) {
    try {
      return await undiciGlpiHttps(url, init, getTlsInsecureAgent());
    } catch (insecureError) {
      const strictMsg = errorMessageWithCause(strictError);
      const insecureMsg = errorMessageWithCause(insecureError);
      throw new Error(
        `fetch failed (TLS estrito e fallback inseguro falharam): strict="${strictMsg}" insecure="${insecureMsg}"`
      );
    }
  }
}

/** Dica para mensagens de erro de rede/TLS quando TLS estrito ainda está ativo. */
export function glpiTlsInsecureHintParaErroDeRede(message: string): string {
  if (glpiTlsInsecureEnabled()) return "";
  const m = message.toLowerCase();
  if (
    !m.includes("fetch failed") &&
    !m.includes("certificate") &&
    !m.includes("cert") &&
    !m.includes("ssl") &&
    !m.includes("tls") &&
    !m.includes("unable_to_verify") &&
    !m.includes("self signed")
  ) {
    return "";
  }
  return " Se este GLPI usa HTTPS com certificado privado ou não reconhecido, defina GLPI_TLS_INSECURE=1 no ambiente do app (equivalente a curl -k; avalie o risco em produção).";
}

/** Dica quando initSession esgota tempo ou ping retorna fetch failed (TLS ou firewall). */
export function glpiRedeTlsOuFirewallHint(): string {
  if (glpiTlsInsecureEnabled()) {
    const ipv4 = ipv4First
      ? ""
      : " Se ainda falhar, tente não definir GLPI_FORCE_IPV4=0 (o padrão do app prioriza IPv4).";
    return ` Se o problema continua, o firewall do GLPI pode estar bloqueando o IP de saída do hospedeiro (ex.: Railway): libere esse IP ou use um proxy.${ipv4}`;
  }
  return " Com ping mostrando \"fetch failed\" ou tempo esgotado no initSession, defina GLPI_TLS_INSECURE=1 no ambiente do app (como curl -k). Se já estiver ativo, verifique firewall do GLPI para o IP do servidor da aplicação.";
}
