"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Search } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  entidade: string;
  entidadeId: string;
  acao: string;
  criadoEm: string;
  usuario: string | null;
};

export function AuditoriaClient() {
  const [entidade, setEntidade] = useState("");
  const [acao, setAcao] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (entidade.trim()) p.set("entidade", entidade.trim());
      if (acao.trim()) p.set("acao", acao.trim());
      p.set("take", "300");
      const r = await fetch(`/api/auditoria?${p}`);
      if (r.ok) setRows(await r.json());
    } finally {
      setLoading(false);
    }
  }, [entidade, acao]);

  function exportarCsv() {
    const p = new URLSearchParams();
    if (entidade.trim()) p.set("entidade", entidade.trim());
    if (acao.trim()) p.set("acao", acao.trim());
    p.set("format", "csv");
    p.set("take", "2000");
    window.open(`/api/auditoria?${p}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Entidade (contém)</Label>
            <Input
              placeholder="Ex.: Contrato, LancamentoUst"
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="space-y-2">
            <Label>Ação (contém)</Label>
            <Input
              placeholder="Ex.: CRIACAO, ATUALIZACAO"
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              className="w-48"
            />
          </div>
          <Button onClick={buscar} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
          <Button type="button" variant="secondary" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-[560px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Use os filtros e clique em Buscar.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(r.criadoEm)}
                    </TableCell>
                    <TableCell className="text-sm">{r.usuario ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entidade}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">
                      {r.entidadeId}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{r.acao}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
