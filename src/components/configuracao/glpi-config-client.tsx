"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { validarFormatoUrlApiGlpi } from "@/lib/glpi-test-connection";
import { cn } from "@/lib/utils";

type GlpiTestStep = { id: string; label: string; ok: boolean; detail?: string };

type GlpiDebugCredenciais = {
  baseUrl: string;
  userToken: string;
  appToken: string;
};

type UrlFmt = { kind: "empty" } | { kind: "error"; message: string } | { kind: "ok"; normalized: string };
type UrlPing = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; detail: string } | { kind: "error"; detail: string };

export function GlpiConfigClient({ podeEditar }: { podeEditar: boolean }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [appToken, setAppToken] = useState("");
  const [userToken, setUserToken] = useState("");
  const [appJaSalvo, setAppJaSalvo] = useState(false);
  const [userJaSalvo, setUserJaSalvo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [steps, setSteps] = useState<GlpiTestStep[] | null>(null);
  const [debugCredenciaisUsadas, setDebugCredenciaisUsadas] = useState<GlpiDebugCredenciais | null>(null);
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [urlFmt, setUrlFmt] = useState<UrlFmt>({ kind: "empty" });
  const [urlPing, setUrlPing] = useState<UrlPing>({ kind: "idle" });
  const [limparAppTokenSalvo, setLimparAppTokenSalvo] = useState(false);

  const fmtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingAbortRef = useRef<AbortController | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/configuracao/glpi", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setBaseUrl(d.baseUrl ?? "");
        setAppJaSalvo(Boolean(d.appTokenPreenchido));
        setUserJaSalvo(Boolean(d.userTokenPreenchido));
        setMsg(null);
        setSteps(null);
        setDebugCredenciaisUsadas(null);
      })
      .catch(() => setMsg("Erro ao carregar configuração"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (fmtTimerRef.current) clearTimeout(fmtTimerRef.current);
    if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
    pingAbortRef.current?.abort();
    pingAbortRef.current = null;

    if (!baseUrl.trim()) {
      setUrlFmt({ kind: "empty" });
      setUrlPing({ kind: "idle" });
      return;
    }

    fmtTimerRef.current = setTimeout(() => {
      const v = validarFormatoUrlApiGlpi(baseUrl);
      if (!v.ok) {
        setUrlFmt({ kind: "error", message: v.message });
        setUrlPing({ kind: "idle" });
        return;
      }
      setUrlFmt({ kind: "ok", normalized: v.normalized });

      pingTimerRef.current = setTimeout(() => {
        const ac = new AbortController();
        pingAbortRef.current = ac;
        setUrlPing({ kind: "loading" });
        fetch("/api/configuracao/glpi/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl }),
          cache: "no-store",
          signal: ac.signal,
        })
          .then(async (r) => {
            const j = (await r.json()) as { ok?: boolean; detail?: string };
            if (ac.signal.aborted) return;
            if (j.ok) setUrlPing({ kind: "ok", detail: j.detail ?? "Resposta recebida." });
            else setUrlPing({ kind: "error", detail: j.detail ?? "Falha ao contatar o servidor." });
          })
          .catch((e) => {
            if (ac.signal.aborted) return;
            const m = e instanceof Error ? e.message : String(e);
            setUrlPing({ kind: "error", detail: m.includes("abort") ? "Verificação cancelada." : m.slice(0, 200) });
          });
      }, 400);
    }, 450);

    return () => {
      if (fmtTimerRef.current) clearTimeout(fmtTimerRef.current);
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
      pingAbortRef.current?.abort();
    };
  }, [baseUrl]);

  function bodyAtual() {
    return {
      baseUrl,
      appToken: appToken.trim() || undefined,
      userToken: userToken.trim() || undefined,
      ...(limparAppTokenSalvo ? { limparAppToken: true as const } : {}),
    };
  }

  const testarConexao = useCallback(
    async (opts?: { automatico?: boolean }) => {
      const automatico = Boolean(opts?.automatico);
      setDebugCredenciaisUsadas(null);
      if (!automatico) {
        setMsg(null);
        setSteps(null);
      }
      testAbortRef.current?.abort();
      const ac = new AbortController();
      testAbortRef.current = ac;
      setTestando(true);
      try {
        const r = await fetch("/api/configuracao/glpi/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyAtual()),
          cache: "no-store",
          signal: ac.signal,
        });
        const j = (await r.json()) as {
          message?: string;
          steps?: GlpiTestStep[];
          ok?: boolean;
          persistirAppTokenVazio?: boolean;
          debugCredenciaisUsadas?: GlpiDebugCredenciais;
        };
        if (ac.signal.aborted) return;
        setSteps(Array.isArray(j.steps) ? j.steps : []);
        if (j.debugCredenciaisUsadas) setDebugCredenciaisUsadas(j.debugCredenciaisUsadas);
        if (!r.ok) {
          setMsg(j.message ?? "Teste não pôde ser concluído.");
          return;
        }
        setMsg(
          automatico
            ? j.ok
              ? j.persistirAppTokenVazio
                ? "Integração OK sem App Token — pode salvar; remova o token salvo ou use Salvar com limpar."
                : "Tokens e integração verificados automaticamente."
              : j.message ?? "Verificação automática encontrou problemas."
            : j.message ?? (j.ok ? "Conexão validada." : "Teste concluído com falhas.")
        );
      } catch (e) {
        if (ac.signal.aborted) return;
        setMsg(e instanceof Error && e.name === "AbortError" ? null : "Erro de rede ao testar conexão.");
      } finally {
        if (!ac.signal.aborted) setTestando(false);
      }
    },
    [baseUrl, appToken, userToken, limparAppTokenSalvo]
  );

  function podeTestarCredenciais(): boolean {
    const urlOk = validarFormatoUrlApiGlpi(baseUrl).ok;
    const temUser = userToken.trim().length > 0 || userJaSalvo;
    return urlOk && temUser;
  }

  function onBlurUserToken() {
    if (!podeEditar || testando || salvando) return;
    if (!userToken.trim() && !userJaSalvo) {
      setMsg("Informe o User Token (ou salve um no banco) para validar a integração.");
      return;
    }
    if (!validarFormatoUrlApiGlpi(baseUrl).ok) {
      setMsg("Corrija a URL da API antes de validar os tokens.");
      return;
    }
    void testarConexao({ automatico: true });
  }

  function onBlurAppToken() {
    if (!podeEditar || testando || salvando) return;
    if (!podeTestarCredenciais()) {
      setMsg("Preencha uma URL válida e o User Token antes de validar o App Token.");
      return;
    }
    void testarConexao({ automatico: true });
  }

  async function salvar() {
    setMsg(null);
    setSteps(null);
    setDebugCredenciaisUsadas(null);
    if (!baseUrl.trim()) {
      setMsg("Preencha a URL da API do GLPI ou defina GLPI_URL no servidor.");
      return;
    }
    if (!validarFormatoUrlApiGlpi(baseUrl).ok) {
      setMsg("A URL não é válida (use http(s)://… com caminho correto para o seu ambiente).");
      return;
    }
    if (!userToken.trim() && !userJaSalvo) {
      setMsg("Informe o User Token ou use um já salvo no banco / GLPI_USER_TOKEN no ambiente.");
      return;
    }
    setSalvando(true);
    const marcouLimparApp = limparAppTokenSalvo;
    try {
      const r = await fetch("/api/configuracao/glpi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyAtual()),
        cache: "no-store",
      });
      const j = (await r.json()) as {
        message?: string;
        steps?: GlpiTestStep[];
        baseUrl?: string;
        persistirAppTokenVazio?: boolean;
        debugCredenciaisUsadas?: GlpiDebugCredenciais;
      };
      if (Array.isArray(j.steps)) setSteps(j.steps);
      if (j.debugCredenciaisUsadas) setDebugCredenciaisUsadas(j.debugCredenciaisUsadas);
      if (!r.ok) {
        setMsg(j.message ?? "Erro ao salvar");
        return;
      }
      setMsg(j.message ?? "Configuração salva.");
      setBaseUrl(j.baseUrl ?? baseUrl);
      setAppToken("");
      setUserToken("");
      setLimparAppTokenSalvo(false);
      setAppJaSalvo(j.persistirAppTokenVazio || marcouLimparApp ? false : true);
      setUserJaSalvo(true);
    } catch {
      setMsg("Erro de rede ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  const urlInputClass = cn(
    urlFmt.kind === "error" && "border-destructive focus-visible:ring-destructive/40",
    urlFmt.kind === "ok" && urlPing.kind === "ok" && "border-emerald-600/70 focus-visible:ring-emerald-600/30",
    urlFmt.kind === "ok" && urlPing.kind === "error" && "border-amber-600/60"
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>GLPI</CardTitle>
        <CardDescription>
          URL até <code className="text-[11px]">apirest.php</code>, User Token e App Token. Teste ao sair dos campos de token.
          Tokens vazios mantêm o salvo. Variáveis no servidor:{" "}
          <code className="text-[11px]">GLPI_URL</code>, <code className="text-[11px]">GLPI_APP_TOKEN</code>,{" "}
          <code className="text-[11px]">GLPI_USER_TOKEN</code>. HTTPS com certificado interno:{" "}
          <code className="text-[11px]">GLPI_TLS_INSECURE=1</code> (como <code className="text-[11px]">curl -k</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 max-w-xl">
        {msg && (
          <p
            className={`text-sm ${msg.includes("falhou") || msg.includes("Erro") || msg.includes("problemas") ? "text-destructive" : "text-muted-foreground"}`}
          >
            {msg}
          </p>
        )}
        {steps && steps.length > 0 && (
          <details className="rounded-md border px-3 py-2 text-sm open:pb-3">
            <summary className="cursor-pointer font-medium outline-none">
              Último teste ({steps.filter((s) => s.ok).length}/{steps.length} ok)
            </summary>
            <ul className="mt-3 list-none space-y-2 pl-0">
              {steps.map((s) => (
                <li key={s.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-start sm:gap-2">
                  <Badge variant={s.ok ? "default" : "destructive"} className="w-fit shrink-0">
                    {s.ok ? "Ok" : "Falhou"}
                  </Badge>
                  <span>
                    <span className="font-medium">{s.label}</span>
                    {s.detail ? (
                      <span className="text-muted-foreground block sm:inline sm:ml-1">— {s.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {debugCredenciaisUsadas && (
          <div className="rounded-md border border-amber-600/50 bg-amber-50/80 p-3 text-xs dark:bg-amber-950/25">
            <p className="font-medium text-amber-950 dark:text-amber-100">
              Debug — valores efetivos neste teste (remover na versão final)
            </p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
              Compare com o <code className="text-[11px]">curl</code>; não compartilhe esta tela publicamente.
            </p>
            <dl className="mt-3 space-y-2 font-mono text-[11px] break-all text-foreground">
              <div>
                <dt className="text-muted-foreground">URL</dt>
                <dd>{debugCredenciaisUsadas.baseUrl || "(vazio)"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">User Token</dt>
                <dd>{debugCredenciaisUsadas.userToken || "(vazio)"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">App Token</dt>
                <dd>{debugCredenciaisUsadas.appToken || "(vazio)"}</dd>
              </div>
            </dl>
          </div>
        )}
        <div className="space-y-2">
          <Label>URL (apirest.php)</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://suporte.empresa.gov.br/apirest.php"
            disabled={!podeEditar}
            className={urlInputClass}
            aria-invalid={urlFmt.kind === "error"}
          />
          {urlFmt.kind === "error" && <p className="text-xs text-destructive">{urlFmt.message}</p>}
          {urlFmt.kind === "ok" && urlPing.kind === "loading" && (
            <p className="text-xs text-muted-foreground">Alcançando o servidor…</p>
          )}
          {urlFmt.kind === "ok" && urlPing.kind === "ok" && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{urlPing.detail}</p>
          )}
          {urlFmt.kind === "ok" && urlPing.kind === "error" && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{urlPing.detail}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>User Token</Label>
            {userJaSalvo && (
              <Badge variant="secondary" className="text-xs font-normal">
                salvo
              </Badge>
            )}
          </div>
          <Input
            type="password"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            onBlur={onBlurUserToken}
            placeholder="Preferências do usuário no GLPI (chave remota)"
            disabled={!podeEditar}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>App Token</Label>
            {appJaSalvo && (
              <Badge variant="secondary" className="text-xs font-normal">
                salvo
              </Badge>
            )}
          </div>
          <Input
            type="password"
            value={appToken}
            onChange={(e) => setAppToken(e.target.value)}
            onBlur={onBlurAppToken}
            placeholder="Configuração → Geral → API (opcional em alguns GLPI)"
            disabled={!podeEditar}
            autoComplete="off"
          />
          <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={limparAppTokenSalvo}
              onChange={(e) => setLimparAppTokenSalvo(e.target.checked)}
              disabled={!podeEditar}
            />
            <span>Salvar sem App Token (apaga o token salvo nesta confirmação).</span>
          </label>
        </div>

        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => testarConexao()} disabled={testando || salvando} variant="secondary">
              {testando ? "Testando…" : "Testar conexão"}
            </Button>
            <Button type="button" onClick={salvar} disabled={salvando || testando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        )}
        {!podeEditar && (
          <p className="text-sm text-muted-foreground">Somente leitura: permissão de edição em UST &amp; catálogo.</p>
        )}
      </CardContent>
    </Card>
  );
}
