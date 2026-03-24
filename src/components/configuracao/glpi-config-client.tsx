"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GlpiConfigClient({ podeEditar }: { podeEditar: boolean }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [appToken, setAppToken] = useState("");
  const [userToken, setUserToken] = useState("");
  const [campoBusca, setCampoBusca] = useState(71);
  const [criteriosExtra, setCriteriosExtra] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/configuracao/glpi")
      .then((r) => r.json())
      .then((d) => {
        setBaseUrl(d.baseUrl ?? "");
        setCampoBusca(typeof d.campoBuscaGrupoTecnico === "number" ? d.campoBuscaGrupoTecnico : 71);
        setCriteriosExtra(d.criteriosExtraJson ?? "");
        setMsg(null);
      })
      .catch(() => setMsg("Erro ao carregar configuração"))
      .finally(() => setLoading(false));
  }, []);

  async function salvar() {
    setMsg(null);
    const r = await fetch("/api/configuracao/glpi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        appToken: appToken.trim() || undefined,
        userToken: userToken.trim() || undefined,
        campoBuscaGrupoTecnico: campoBusca,
        criteriosExtraJson: criteriosExtra.trim() || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.message ?? "Erro ao salvar");
      return;
    }
    setMsg("Configuração salva.");
    setAppToken("");
    setUserToken("");
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão com o GLPI</CardTitle>
        <CardDescription>
          URL do <code className="text-xs">apirest.php</code>, App Token e User Token (usuário de serviço). Deixe os
          tokens em branco para manter os valores já salvos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
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
          <Label>App Token</Label>
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
          <Label>User Token</Label>
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
          <Button type="button" onClick={salvar}>
            Salvar
          </Button>
        )}
        {!podeEditar && (
          <p className="text-sm text-muted-foreground">Somente leitura: permissão de edição em UST &amp; catálogo.</p>
        )}
      </CardContent>
    </Card>
  );
}
