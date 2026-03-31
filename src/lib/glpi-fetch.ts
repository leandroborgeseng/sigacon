/** fetch ao GLPI com opção de ignorar falha de certificado TLS (GLPI_TLS_INSECURE). */

let glpiInsecureChain: Promise<unknown> = Promise.resolve();

/** true se GLPI_TLS_INSECURE está ativo (1/true/yes). */
export function glpiTlsInsecureEnabled(): boolean {
  const v = process.env.GLPI_TLS_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Enfileira chamadas quando TLS inseguro está ligado para evitar corrida em NODE_TLS_REJECT_UNAUTHORIZED
 * (outras requisições HTTPS no processo não devem ver o valor alterado em paralelo).
 */
async function fetchComTlsInseguro(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    return await fetch(input, init);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}

/**
 * fetch HTTP(s) para o GLPI. Com GLPI_TLS_INSECURE=1 ignora verificação do certificado TLS
 * (equivalente a curl -k). Use só quando o servidor GLPI tiver certificado interno ou cadeia incompleta.
 */
export async function glpiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!glpiTlsInsecureEnabled()) {
    return fetch(input, init);
  }
  const next = glpiInsecureChain.then(() => fetchComTlsInseguro(input, init));
  glpiInsecureChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
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
    return " Se o problema continua, o firewall do GLPI pode estar bloqueando o IP de saída do seu hospedeiro (ex.: Railway): libere esse IP ou use um proxy.";
  }
  return " Com ping mostrando \"fetch failed\" ou tempo esgotado no initSession, defina GLPI_TLS_INSECURE=1 no ambiente do app (como curl -k). Se já estiver ativo, verifique firewall do GLPI para o IP do servidor da aplicação.";
}
