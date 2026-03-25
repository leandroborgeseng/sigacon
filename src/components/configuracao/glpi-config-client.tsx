"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { alternativasBaseApirestUrl } from "@/lib/glpi-apirest-session";
import {
  sugerirUrlApiLegadaGlpi,
  urlApontaParaApiAltaNivelGlpi,
  validarFormatoUrlApiGlpi,
} from "@/lib/glpi-test-connection";
import { cn } from "@/lib/utils";

type GlpiTestStep = { id: string; label: string; ok: boolean; detail?: string };

type UrlFmt = { kind: "empty" } | { kind: "error"; message: string } | { kind: "ok"; normalized: string };
type UrlPing = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; detail: string } | { kind: "error"; detail: string };

export function GlpiConfigClient({ podeEditar }: { podeEditar: boolean }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [appToken, setAppToken] = useState("");
  const [userToken, setUserToken] = useState("");
  const [campoBusca, setCampoBusca] = useState(71);
  const [criteriosExtra, setCriteriosExtra] = useState("");
  const [appJaSalvo, setAppJaSalvo] = useState(false);
  const [userJaSalvo, setUserJaSalvo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [steps, setSteps] = useState<GlpiTestStep[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [urlFmt, setUrlFmt] = useState<UrlFmt>({ kind: "empty" });
  const [urlPing, setUrlPing] = useState<UrlPing>({ kind: "idle" });

  const fmtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingAbortRef = useRef<AbortController | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/configuracao/glpi", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setBaseUrl(d.baseUrl ?? "");
        setCampoBusca(typeof d.campoBuscaGrupoTecnico === "number" ? d.campoBuscaGrupoTecnico : 71);
        setCriteriosExtra(d.criteriosExtraJson ?? "");
        setAppJaSalvo(Boolean(d.appTokenPreenchido));
        setUserJaSalvo(Boolean(d.userTokenPreenchido));
        setMsg(null);
        setSteps(null);
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
      campoBuscaGrupoTecnico: campoBusca,
      criteriosExtraJson: criteriosExtra.trim() || null,
    };
  }

  const testarConexao = useCallback(
    async (opts?: { automatico?: boolean }) => {
      const automatico = Boolean(opts?.automatico);
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
        const j = (await r.json()) as { message?: string; steps?: GlpiTestStep[]; ok?: boolean };
        if (ac.signal.aborted) return;
        setSteps(Array.isArray(j.steps) ? j.steps : []);
        if (!r.ok) {
          setMsg(j.message ?? "Teste não pôde ser concluído.");
          return;
        }
        setMsg(
          automatico
            ? j.ok
              ? "Tokens e integração verificados automaticamente."
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
    [baseUrl, appToken, userToken, campoBusca, criteriosExtra]
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
    if (!baseUrl.trim()) {
      setMsg("Preencha a URL da API (…/apirest.php) ou defina GLPI_URL no servidor.");
      return;
    }
    if (!validarFormatoUrlApiGlpi(baseUrl).ok) {
      setMsg("A URL ainda não está no formato esperado (deve terminar em apirest.php).");
      return;
    }
    if (!userToken.trim() && !userJaSalvo) {
      setMsg("Informe o User Token ou use um já salvo no banco / GLPI_USER_TOKEN no ambiente.");
      return;
    }
    setSalvando(true);
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
        campoBuscaGrupoTecnico?: number;
        criteriosExtraJson?: string;
      };
      if (Array.isArray(j.steps)) setSteps(j.steps);
      if (!r.ok) {
        setMsg(j.message ?? "Erro ao salvar");
        return;
      }
      setMsg(j.message ?? "Configuração salva.");
      setBaseUrl(j.baseUrl ?? baseUrl);
      if (typeof j.campoBuscaGrupoTecnico === "number") setCampoBusca(j.campoBuscaGrupoTecnico);
      if (j.criteriosExtraJson != null) setCriteriosExtra(j.criteriosExtraJson);
      setAppToken("");
      setUserToken("");
      setAppJaSalvo(true);
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

  const urlLegadoSugerida = urlFmt.kind === "ok" ? sugerirUrlApiLegadaGlpi(urlFmt.normalized) : null;
  const urlEhApiV2 = urlFmt.kind === "ok" && urlApontaParaApiAltaNivelGlpi(urlFmt.normalized);
  const basesApirestAlt =
    urlFmt.kind === "ok" ? alternativasBaseApirestUrl(urlFmt.normalized) : [""];
  const urlBaseRaizApirest = basesApirestAlt.length > 1 ? basesApirestAlt[1] : null;

  const urlInputClass = cn(
    urlFmt.kind === "error" && "border-destructive focus-visible:ring-destructive/40",
    urlFmt.kind === "ok" && urlEhApiV2 && "border-amber-600/70 focus-visible:ring-amber-600/30",
    urlFmt.kind === "ok" && !urlEhApiV2 && urlPing.kind === "ok" && "border-emerald-600/70 focus-visible:ring-emerald-600/30",
    urlFmt.kind === "ok" && !urlEhApiV2 && urlPing.kind === "error" && "border-amber-600/60"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão com o GLPI</CardTitle>
        <CardDescription className="space-y-2">
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            <strong className="font-medium">Validação em tempo real:</strong> o formato da URL é conferido ao digitar; em
            seguida o servidor tenta contatar o GLPI. Ao sair do campo User Token ou App Token (após preencher), a
            autenticação e o restante da integração são testados automaticamente.
          </p>
          <p>
            Use a <strong>API legada (v1)</strong> com User Token + App Token — ex.{" "}
            <code className="text-xs">…/api.php/v1/apirest.php</code> ou <code className="text-xs">…/apirest.php</code>{" "}
            na raiz. Caminhos como <code className="text-xs">/api.php/v2.x/apirest.php</code> são a API de alto nível
            (OAuth2 Bearer); ela não aceita <code className="text-xs">user_token</code> no{" "}
            <code className="text-xs">Authorization</code>. Ver versões em{" "}
            <a
              href="https://help.glpi-project.org/documentation/en/modules/configuration/general/api/restful-api-v2"
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              documentação GLPI (RESTful API V2)
            </a>
            .
          </p>
          <p>
            Deixe tokens em branco para manter os salvos no banco; o servidor pode usar{" "}
            <code className="text-xs">GLPI_URL</code>, <code className="text-xs">GLPI_APP_TOKEN</code> e{" "}
            <code className="text-xs">GLPI_USER_TOKEN</code> no ambiente.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {msg && (
          <p
            className={`text-sm ${msg.includes("falhou") || msg.includes("Erro") || msg.includes("problemas") ? "text-destructive" : "text-muted-foreground"}`}
          >
            {msg}
          </p>
        )}
        {steps && steps.length > 0 && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Resultado do teste de integração</p>
            <ul className="space-y-2">
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
          </div>
        )}
        <div className="space-y-2">
          <Label>URL base (apirest.php)</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://glpi.empresa.com/api.php/v1/apirest.php"
            disabled={!podeEditar}
            className={urlInputClass}
            aria-invalid={urlFmt.kind === "error"}
          />
          {urlFmt.kind === "error" && <p className="text-xs text-destructive">{urlFmt.message}</p>}
          {urlFmt.kind === "ok" && (
            <p className="text-xs text-muted-foreground">
              Formato ok: <code className="text-[11px]">{urlFmt.normalized}</code>
            </p>
          )}
          {urlFmt.kind === "ok" && urlBaseRaizApirest && (
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
              Se <code className="text-[11px]">initSession</code> falhar com{" "}
              <code className="text-[11px]">SESSION_TOKEN_MISSING</code>, teste a base na raiz:{" "}
              <code className="text-[11px] break-all">{urlBaseRaizApirest}</code>
            </p>
          )}
          {urlFmt.kind === "ok" && urlPing.kind === "loading" && (
            <p className="text-xs text-muted-foreground">Verificando se o servidor responde…</p>
          )}
          {urlFmt.kind === "ok" && urlPing.kind === "ok" && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{urlPing.detail}</p>
          )}
          {urlFmt.kind === "ok" && urlPing.kind === "error" && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{urlPing.detail}</p>
          )}
          {urlFmt.kind === "ok" && urlEhApiV2 && urlLegadoSugerida && (
            <div className="rounded-md border border-amber-600/40 bg-amber-50/80 p-3 text-xs dark:bg-amber-950/30">
              <p className="font-medium text-amber-900 dark:text-amber-100">URL aponta para API v2+ (OAuth), incompatível com User Token.</p>
              <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
                Ajuste para a base da API legada (v1), por exemplo:
              </p>
              <code className="mt-1 block break-all text-[11px] text-foreground">{urlLegadoSugerida}</code>
              {podeEditar && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setBaseUrl(urlLegadoSugerida)}
                >
                  Usar URL sugerida (v1)
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>App Token</Label>
            {appJaSalvo && (
              <Badge variant="secondary" className="text-xs font-normal">
                já cadastrado
              </Badge>
            )}
          </div>
          <Input
            type="password"
            value={appToken}
            onChange={(e) => setAppToken(e.target.value)}
            onBlur={onBlurAppToken}
            placeholder="Preencha apenas para alterar — valida ao sair do campo"
            disabled={!podeEditar}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">Ao sair deste campo, rodamos o teste completo se a URL e o User Token estiverem ok.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>User Token</Label>
            {userJaSalvo && (
              <Badge variant="secondary" className="text-xs font-normal">
                já cadastrado
              </Badge>
            )}
          </div>
          <Input
            type="password"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            onBlur={onBlurUserToken}
            placeholder="Cole o token e saia do campo para validar"
            disabled={!podeEditar}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label>Campo de busca: grupo técnico atribuído (Ticket)</Label>
          <Input
            type="number"
            value={campoBusca}
            onChange={(e) => setCampoBusca(Number(e.target.value))}
            disabled={!podeEditar}
          />
          <p className="text-xs text-muted-foreground">
            Padrão 71; se a busca não retornar tickets, ajuste conforme o seu GLPI (ex.: use{" "}
            <code className="text-xs">listSearchOptions/Ticket</code> na API).
          </p>
        </div>
        <div className="space-y-2">
          <Label>Critérios extras de busca (JSON opcional)</Label>
          <Textarea
            value={criteriosExtra}
            onChange={(e) => setCriteriosExtra(e.target.value)}
            rows={4}
            disabled={!podeEditar}
            placeholder='[{"field":12,"searchtype":"equals","value":2,"link":"AND"}]'
            className="font-mono text-xs"
          />
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
