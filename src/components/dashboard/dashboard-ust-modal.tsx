"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type Det = {
  contratoNome: string;
  ano: number;
  totalUst: number;
  totalValor: number;
  limiteUstAno: number | null;
  limiteValorUstAno: number | null;
  pctUst: number | null;
  pctValor: number | null;
  maioresLancamentos: Array<{
    mes: number;
    tipo: string;
    qtd: number;
    ust: number;
    valor: number;
  }>;
};

export function DashboardUstModal({
  contratoId,
  open,
  onOpenChange,
}: {
  contratoId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [data, setData] = useState<Det | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !contratoId) {
      setData(null);
      setErr(null);
      return;
    }
    const ano = new Date().getFullYear();
    fetch(`/api/contratos/${contratoId}/ust-resumo-ano?ano=${ano}`)
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar");
        return r.json();
      })
      .then(setData)
      .catch(() => setErr("Não foi possível carregar o detalhamento."));
  }, [open, contratoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consumo UST no ano — detalhe</DialogTitle>
        </DialogHeader>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {data && (
          <div className="space-y-4 text-sm">
            <p>
              <strong>{data.contratoNome}</strong> — {data.ano}
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              <div>
                Total UST: <strong>{data.totalUst.toFixed(2)}</strong>
                {data.limiteUstAno != null && data.limiteUstAno > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    / {data.limiteUstAno} ({data.pctUst}%)
                  </span>
                )}
              </div>
              <div>
                Valor UST:{" "}
                <strong>
                  {data.totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
                {data.limiteValorUstAno != null && data.limiteValorUstAno > 0 && (
                  <span className="text-muted-foreground"> ({data.pctValor}% do teto)</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Maiores lançamentos do ano (por UST):
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">UST</TableHead>
                  <TableHead className="text-right">R$</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.maioresLancamentos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.mes}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.tipo}</TableCell>
                    <TableCell className="text-right">{r.qtd}</TableCell>
                    <TableCell className="text-right">{r.ust.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Link href="/execucao-tecnica" className="text-primary text-sm underline">
              Ir à execução técnica (UST)
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
