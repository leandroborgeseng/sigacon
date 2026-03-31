/**
 * HTTP(s) para o GLPI no servidor Node (Railway, Docker).
 * curl no seu Mac pode funcionar enquanto o app falha: TLS com cadeia incompleta e/ou IPv6.
 */

import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

const ipv4First =
  process.env.GLPI_FORCE_IPV4?.trim().toLowerCase() === "1" ||
  process.env.GLPI_FORCE_IPV4?.trim().toLowerCase() === "true" ||
  process.env.GLPI_FORCE_IPV4?.trim().toLowerCase() === "yes";

if (ipv4First && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/** true se GLPI_TLS_INSECURE está ativo (1/true/yes). */
export function glpiTlsInsecureEnabled(): boolean {
  const v = process.env.GLPI_TLS_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let tlsInsecureAgent: Agent | null = null;

function getTlsInsecureAgent(): Agent {
  if (!tlsInsecureAgent) {
    tlsInsecureAgent = new Agent({
      connect: {
        rejectUnauthorized: false,
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

/**
 * fetch para o GLPI.
 * - GLPI_TLS_INSECURE=1: TLS como curl -k via Agent (sem NODE_TLS_REJECT_UNAUTHORIZED global).
 * - GLPI_FORCE_IPV4=1: prioriza IPv4 (ajuda quando IPv6 do servidor GLPI não responde ao Railway).
 */
export async function glpiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (glpiTlsInsecureEnabled()) {
    const url = requestUrlString(input);
    const res = await undiciFetch(url, {
      ...(init ?? {}),
      dispatcher: getTlsInsecureAgent(),
    } as Parameters<typeof undiciFetch>[1]);
    return res as unknown as Response;
  }
  return fetch(input, init);
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
      : " Se ainda falhar, tente GLPI_FORCE_IPV4=1 (alguns servidores só respondem bem em IPv4 a partir da nuvem).";
    return ` Se o problema continua, o firewall do GLPI pode estar bloqueando o IP de saída do hospedeiro (ex.: Railway): libere esse IP ou use um proxy.${ipv4}`;
  }
  return " Com ping mostrando \"fetch failed\" ou tempo esgotado no initSession, defina GLPI_TLS_INSECURE=1 no ambiente do app (como curl -k). Se já estiver ativo, use GLPI_FORCE_IPV4=1 e verifique firewall do GLPI para o IP do servidor da aplicação.";
}
