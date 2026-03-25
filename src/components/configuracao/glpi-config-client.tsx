"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type GlpiTestStep = { id: string; label: string; ok: boolean; detail?: string };

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

  useEffect(() => {
    fetch("/api/configuracao/glpi")
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

  function bodyAtual() {
    return {
      baseUrl,
      appToken: appToken.trim() || undefined,
      userToken: userToken.trim() || undefined,
      campoBuscaGrupoTecnico: campoBusca,
      criteriosExtraJson: criteriosExtra.trim() || null,
    };
  }

  async function testarConexao() {
    setMsg(null);
    setSteps(null);
    setTestando(true);
    try {
      const r = await fetch("/api/configuracao/glpi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyAtual()),
      });
      const j = (await r.json()) as { message?: string; steps?: GlpiTestStep[]; ok?: boolean };
      setSteps(Array.isArray(j.steps) ? j.steps : []);
      if (!r.ok) {
        setMsg(j.message ?? "Teste não pôde ser concluído.");
        return;
      }
      setMsg(j.message ?? (j.ok ? "Conexão validada." : "Teste concluído com falhas."));
    } catch {
      setMsg("Erro de rede ao testar conexão.");
    } finally {
      setTestando(false);
    }
  }

  async function salvar() {
    setMsg(null);
    setSteps(null);
    if (!baseUrl.trim()) {
      setMsg("Preencha a URL da API (…/apirest.php) ou defina GLPI_URL no servidor.");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão com o GLPI</CardTitle>
        <CardDescription className="space-y-2">
          <p>
            A integração usa a API REST oficial do GLPI (<code className="text-xs">apirest.php</code>
            ), documentada no repositório do GLPI. Autenticação típica: cabeçalho{" "}
            <code className="text-xs">App-Token</code> (definido em Configuração → Geral → API) e{" "}
            <code className="text-xs">Authorization: user_token …</code> (chave de acesso remoto do
            usuário, em Preferências do usuário no GLPI). Alternativa na documentação: login e senha via
            Basic Auth.
          </p>
          <p>
            Deixe App Token / User Token em branco no formulário para manter os valores já salvos no
            banco; o servidor também pode usar <code className="text-xs">GLPI_URL</code>,{" "}
            <code className="text-xs">GLPI_APP_TOKEN</code> e <code className="text-xs">GLPI_USER_TOKEN</code>{" "}
            no ambiente.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {msg && (
          <p className={`text-sm ${msg.includes("falhou") || msg.includes("Erro") ? "text-destructive" : "text-muted-foreground"}`}>
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
            placeholder="https://glpi.empresa.com/apirest.php"
            disabled={!podeEditar}
          />
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
            placeholder="Preencha apenas para alterar"
            disabled={!podeEditar}
            autoComplete="off"
          />
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
            placeholder="Preencha apenas para alterar"
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
            <Button type="button" onClick={testarConexao} disabled={testando || salvando} variant="secondary">
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
