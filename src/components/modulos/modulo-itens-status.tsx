"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusItem } from "@prisma/client";

const STATUS_LABELS: Record<StatusItem, string> = {
  ATENDE: "Cumprido",
  NAO_ATENDE: "Não cumprido",
  PARCIAL: "Parcial",
  INCONCLUSIVO: "Inconclusivo",
  DESCONSIDERADO: "Desconsiderado",
  NAO_SE_APLICA: "Não se aplica",
  CABECALHO: "Cabeçalho",
};

type Item = {
  id: string;
  numeroItem: number;
  descricao: string;
  statusAtual: StatusItem;
};

export function ModuloItensStatus({ itens: initialItens = [] }: { itens?: Item[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(Array.isArray(initialItens) ? initialItens : []);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function onStatusChange(itemId: string, statusAtual: StatusItem) {
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/itens/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusAtual }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message ?? "Erro ao atualizar status");
        return;
      }
      setItens((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, statusAtual } : i))
      );
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  if (itens.length === 0) {
    return <p className="p-4 text-muted-foreground">Nenhum item neste módulo.</p>;
  }

  return (
    <ul className="divide-y max-h-[28rem] overflow-y-auto">
      {itens.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2 p-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Link
                href={`/itens/${item.id}`}
                className="font-medium hover:underline text-primary text-sm inline-block"
              >
                Item {item.numeroItem}
              </Link>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {item.descricao ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
            <Select
              value={item.statusAtual ?? "INCONCLUSIVO"}
              onValueChange={(v) => onStatusChange(item.id, v as StatusItem)}
              disabled={updatingId === item.id}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_LABELS) as [StatusItem, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Badge
              variant={
                item.statusAtual === "NAO_ATENDE" || item.statusAtual === "PARCIAL"
                  ? "destructive"
                  : "secondary"
              }
              className="hidden sm:inline-flex"
            >
              {STATUS_LABELS[item.statusAtual as StatusItem] ?? item.statusAtual ?? "—"}
            </Badge>
          </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
