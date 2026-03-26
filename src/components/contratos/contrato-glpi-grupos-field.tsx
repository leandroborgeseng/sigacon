"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type GlpiGrupoOption = { id: number; name: string };

export type GlpiGrupoContratoRow = { glpiGroupId: number; nome: string };

type Props = {
  value: GlpiGrupoContratoRow[];
  onChange: (rows: GlpiGrupoContratoRow[]) => void;
  disabled?: boolean;
};

export function ContratoGlpiGruposField({ value, onChange, disabled }: Props) {
  const [grupos, setGrupos] = useState<GlpiGrupoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idManual, setIdManual] = useState("");
  const [nomeManual, setNomeManual] = useState("");
  const [erroManual, setErroManual] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErro(null);
    fetch("/api/integracao/glpi/grupos")
      .then(async (r) => {
        const j: { grupos?: GlpiGrupoOption[]; message?: string } = await r.json();
        if (!alive) return;
        if (Array.isArray(j.grupos)) setGrupos(j.grupos);
        if (!r.ok) setErro(j.message ?? "Não foi possível carregar grupos do GLPI");
      })
      .catch(() => {
        if (alive) setErro("Falha ao carregar grupos do GLPI");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const idsApi = new Set(grupos.map((g) => g.id));
  const extras = value.filter((v) => !idsApi.has(v.glpiGroupId));

  function rowNome(gid: number): string {
    const fromVal = value.find((v) => v.glpiGroupId === gid);
    const fromApi = grupos.find((x) => x.id === gid);
    return fromApi?.name ?? fromVal?.nome ?? `Grupo ${gid}`;
  }

  function setSeleção(nextIds: number[]) {
    onChange(
      nextIds.map((gid) => ({
        glpiGroupId: gid,
        nome: rowNome(gid),
      }))
    );
  }

  function toggle(id: number, checked: boolean) {
    const set = new Set(value.map((v) => v.glpiGroupId));
    if (checked) set.add(id);
    else set.delete(id);
    setSeleção([...set]);
  }

  function addManual() {
    setErroManual(null);
    const raw = idManual.trim();
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setErroManual("Informe um ID numérico válido (ex.: 3).");
      return;
    }
    if (value.some((v) => v.glpiGroupId === id)) {
      setErroManual("Este ID já está nos filtros.");
      return;
    }
    const nome = nomeManual.trim() || `Grupo ${id}`;
    onChange([...value, { glpiGroupId: id, nome }]);
    setIdManual("");
    setNomeManual("");
  }

  function removeExtra(glpiGroupId: number) {
    onChange(value.filter((v) => v.glpiGroupId !== glpiGroupId));
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label>Grupos técnicos GLPI (atribuídos)</Label>
      <p className="text-xs text-muted-foreground">
        Chamados desse contrato no Kanban são filtrados pelos grupos escolhidos. Use a lista do GLPI quando
        disponível, ou informe o <strong className="font-medium">ID do grupo</strong> no GLPI (Administração →
        Grupos) se a lista vier vazia ou sem permissão de API.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Carregando grupos…</p>}
      {erro && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {erro} Você ainda pode definir os IDs manualmente abaixo.
        </p>
      )}
      {!loading && !erro && grupos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum grupo retornado pela API — adicione os IDs dos grupos que devem filtrar este contrato.
        </p>
      )}

      <div className="rounded-md border bg-muted/30 p-2 space-y-2">
        <p className="text-xs font-medium text-foreground">Adicionar por ID do GLPI</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-muted-foreground">ID do grupo</Label>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="Ex.: 12"
              value={idManual}
              onChange={(e) => setIdManual(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1 flex-1 sm:min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Nome (opcional)</Label>
            <Input
              placeholder="Para exibição"
              value={nomeManual}
              onChange={(e) => setNomeManual(e.target.value)}
              disabled={disabled}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addManual} disabled={disabled}>
            Incluir
          </Button>
        </div>
        {erroManual && <p className="text-xs text-destructive">{erroManual}</p>}
      </div>

      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {grupos.map((g) => (
          <label key={g.id} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              disabled={disabled}
              checked={value.some((v) => v.glpiGroupId === g.id)}
              onChange={(e) => toggle(g.id, e.target.checked)}
            />
            <span>
              <span className="font-mono text-xs text-muted-foreground">#{g.id}</span> {g.name}
            </span>
          </label>
        ))}

        {extras.map((row) => (
          <div
            key={row.glpiGroupId}
            className="flex items-center justify-between gap-2 rounded border border-dashed px-2 py-1.5 text-sm"
          >
            <span>
              <span className="font-mono text-xs text-muted-foreground">#{row.glpiGroupId}</span>{" "}
              {row.nome}
              <span className="ml-1 text-xs text-muted-foreground">(ID manual)</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 text-xs text-destructive"
              disabled={disabled}
              onClick={() => removeExtra(row.glpiGroupId)}
            >
              Remover
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
