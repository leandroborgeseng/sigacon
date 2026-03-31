"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download } from "lucide-react";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function ExecutivoImpressaoClient() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [linhas, setLinhas] = useState<
    Array<{
      contrato: string;
      numero: string;
      temMedicao: boolean;
      percentual: string;
      valorDevido: string;
      valorGlosado: string;
      lancamentosUst: number;
      vigencia90d: string;
    }>
  >([]);
  const [competencia, setCompetencia] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/relatorios/executivo?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.linhas) {
          setLinhas(j.linhas);
          setCompetencia(`${j.competencia.mes}/${j.competencia.ano}`);
        }
      })
      .finally(() => setLoading(false));
  }, [ano, mes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Relatório executivo</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada por contrato ativo na competência — imprima ou salve como PDF pelo
            navegador.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((i) => {
                const a = now.getFullYear() - i;
                return (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((n, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / PDF
        </Button>
        <Button variant="outline" asChild>
          <a
            href={`/api/relatorios/executivo?ano=${ano}&mes=${mes}&format=csv`}
            download
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </a>
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-6 text-black print:shadow-none print:border-0">
        <div className="mb-4 border-b pb-2">
          <h2 className="text-xl font-bold">LeX — Relatório executivo</h2>
          <p className="text-sm">
            Competência: <strong>{competencia || "—"}</strong>
            {loading && " (carregando...)"}
          </p>
          <p className="text-xs text-gray-600">
            Contratos ativos • Valores em reais conforme medição registrada
          </p>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left p-2">Contrato</th>
              <th className="text-left p-2">Nº</th>
              <th className="text-center p-2">Med.</th>
              <th className="text-right p-2">% cumpr.</th>
              <th className="text-right p-2">Devido</th>
              <th className="text-right p-2">Glosado</th>
              <th className="text-center p-2">UST (nº lanç.)</th>
              <th className="text-center p-2">Vig. 90d</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="p-2 max-w-[200px] truncate">{r.contrato}</td>
                <td className="p-2 text-xs">{r.numero}</td>
                <td className="p-2 text-center">{r.temMedicao ? "Sim" : "Não"}</td>
                <td className="p-2 text-right">{r.percentual || "—"}</td>
                <td className="p-2 text-right">{r.valorDevido || "—"}</td>
                <td className="p-2 text-right">{r.valorGlosado || "—"}</td>
                <td className="p-2 text-center">{r.lancamentosUst}</td>
                <td className="p-2 text-center">{r.vigencia90d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
