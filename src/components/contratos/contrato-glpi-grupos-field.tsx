"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label>Grupos técnicos GLPI (atribuídos)</Label>
      <p className="text-xs text-muted-foreground">
        Chamados desse contrato no Kanban são filtrados pelos grupos selecionados. Escolha um ou mais grupos
        cadastrados no GLPI.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Carregando grupos…</p>}
      {erro && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {erro}
        </p>
      )}
      {!loading && grupos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum grupo retornado pelo GLPI. Verifique permissões do usuário técnico e configuração da API GLPI.
        </p>
      )}

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
              <span className="ml-1 text-xs text-muted-foreground">(não retornado pela API)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
