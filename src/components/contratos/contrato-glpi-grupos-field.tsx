"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

export type GlpiGrupoOption = { id: number; name: string };

type Props = {
  /** IDs selecionados */
  selecionados: number[];
  onChange: (rows: { glpiGroupId: number; nome: string }[]) => void;
  disabled?: boolean;
};

export function ContratoGlpiGruposField({ selecionados, onChange, disabled }: Props) {
  const [grupos, setGrupos] = useState<GlpiGrupoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    setLoading(true);
    setErro(null);
    fetch("/api/integracao/glpi/grupos")
      .then((r) => r.json())
      .then((j: { grupos?: GlpiGrupoOption[]; message?: string }) => {
        if (!ok) return;
        if (j.grupos) setGrupos(j.grupos);
        else setErro(j.message ?? "Não foi possível carregar grupos");
      })
      .catch(() => {
        if (ok) setErro("Falha ao carregar grupos do GLPI");
      })
      .finally(() => {
        if (ok) setLoading(false);
      });
    return () => {
      ok = false;
    };
  }, []);

  function toggle(id: number, nome: string, checked: boolean) {
    const set = new Set(selecionados);
    if (checked) set.add(id);
    else set.delete(id);
    const next = [...set];
    onChange(
      next.map((gid) => {
        const g = grupos.find((x) => x.id === gid);
        return { glpiGroupId: gid, nome: g?.name ?? nome };
      })
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label>Grupos técnicos GLPI (atribuídos)</Label>
      <p className="text-xs text-muted-foreground">
        Chamados desse contrato no Kanban são filtrados pelos grupos selecionados. Configure a API GLPI em
        Configuração GLPI se a lista estiver vazia.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Carregando grupos…</p>}
      {erro && <p className="text-xs text-amber-700 dark:text-amber-300">{erro}</p>}
      {!loading && !erro && grupos.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum grupo retornado pelo GLPI.</p>
      )}
      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {grupos.map((g) => (
          <label key={g.id} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              disabled={disabled}
              checked={selecionados.includes(g.id)}
              onChange={(e) => toggle(g.id, g.name, e.target.checked)}
            />
            <span>
              <span className="font-mono text-xs text-muted-foreground">#{g.id}</span> {g.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
