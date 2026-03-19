"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

export function RecalcMedicaoLote() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function executar() {
    if (!confirm(`Recalcular/gerar medição para TODOS os contratos ativos em ${mes}/${ano}?`)) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch("/api/medicoes/recalcular-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano, mes, todos: true }),
      });
      const j = await r.json();
      if (r.ok) {
        setResult(`Sucesso: ${j.sucesso}/${j.processados} contratos.`);
        if (j.erros?.length) setResult((s) => s + ` Erros: ${j.erros.join("; ")}`);
      } else {
        setResult(j.message ?? "Erro");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recalcular medição em lote</CardTitle>
        <CardDescription>
          Gera ou atualiza o registro de medição (checklist + UST) para todos os contratos ativos na
          competência escolhida. Use após importações ou fechamento de mês.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((i) => (
                <SelectItem key={i} value={String(now.getFullYear() - i)}>
                  {now.getFullYear() - i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={executar} disabled={running}>
          <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
          Executar lote
        </Button>
        {result && <p className="text-sm text-muted-foreground w-full">{result}</p>}
      </CardContent>
    </Card>
  );
}
