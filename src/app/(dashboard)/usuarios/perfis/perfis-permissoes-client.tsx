"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERFIL_LABELS, RECURSO_LABELS } from "@/lib/permissions";
import { PerfilUsuario, RecursoPermissao } from "@prisma/client";

type Matrix = Record<string, Record<string, { podeVisualizar: boolean; podeEditar: boolean }>>;

export function PerfisPermissoesClient() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/permissoes")
      .then((r) => r.json())
      .then(setMatrix)
      .catch(() => setMatrix(null))
      .finally(() => setLoading(false));
  }, []);

  function update(perfil: string, recurso: string, field: "podeVisualizar" | "podeEditar", value: boolean) {
    setMatrix((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[perfil]) next[perfil] = {};
      if (!next[perfil][recurso]) next[perfil][recurso] = { podeVisualizar: true, podeEditar: false };
      next[perfil][recurso][field] = value;
      if (field === "podeVisualizar" && !value) next[perfil][recurso].podeEditar = false;
      if (field === "podeEditar" && value) next[perfil][recurso].podeVisualizar = true;
      return next;
    });
  }

  async function handleSave() {
    if (!matrix) return;
    setSaving(true);
    try {
      const res = await fetch("/api/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matrix),
      });
      if (res.ok) router.refresh();
      else alert((await res.json()).message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !matrix) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  const perfis = Object.values(PerfilUsuario);
  const recursos = Object.values(RecursoPermissao);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Matriz de permissões</CardTitle>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Perfil</TableHead>
              {recursos.map((r) => (
                <TableHead key={r} className="text-center min-w-[120px]">
                  {RECURSO_LABELS[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {perfis.map((perfil) => (
              <TableRow key={perfil}>
                <TableCell className="font-medium">{PERFIL_LABELS[perfil]}</TableCell>
                {recursos.map((recurso) => {
                  const cell = matrix[perfil]?.[recurso] ?? { podeVisualizar: true, podeEditar: false };
                  return (
                    <TableCell key={recurso} className="text-center">
                      <div className="flex flex-col gap-2 items-center">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={cell.podeVisualizar}
                            onChange={(e) => update(perfil, recurso, "podeVisualizar", e.target.checked)}
                            className="rounded border-input"
                          />
                          Ver
                        </label>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={cell.podeEditar}
                            disabled={!cell.podeVisualizar}
                            onChange={(e) => update(perfil, recurso, "podeEditar", e.target.checked)}
                            className="rounded border-input"
                          />
                          Editar
                        </label>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
