"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

type ItemVinculado = {
  id: string;
  itemContratual: {
    id: string;
    numeroItem: number;
    descricao: string;
    modulo: { nome: string };
  };
};

type ItemContratual = {
  id: string;
  numeroItem: number;
  descricao: string;
  modulo: { nome: string };
};

export function AtaItensVinculados({
  ataId,
  contratoId,
  itensIniciais,
}: {
  ataId: string;
  contratoId: string;
  itensIniciais: ItemVinculado[];
}) {
  const router = useRouter();
  const [itens, setItens] = useState<ItemVinculado[]>(itensIniciais);
  const [itensContrato, setItensContrato] = useState<ItemContratual[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("__nenhum__");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    setItens(itensIniciais);
  }, [itensIniciais]);

  useEffect(() => {
    if (!contratoId) return;
    setLoadingList(true);
    fetch(`/api/itens?contratoId=${encodeURIComponent(contratoId)}&pageSize=500`)
      .then((r) => r.json())
      .then((data: { itens?: ItemContratual[] }) => {
        setItensContrato(Array.isArray(data.itens) ? data.itens : []);
      })
      .finally(() => setLoadingList(false));
  }, [contratoId]);

  const idsVinculados = new Set(itens.map((i) => i.itemContratual.id));
  const itensDisponiveis = itensContrato.filter((c) => !idsVinculados.has(c.id));

  async function vincular() {
    if (selectedItemId === "__nenhum__" || !selectedItemId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/atas/${ataId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemContratualId: selectedItemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setItens((prev) => [...prev, data]);
        setSelectedItemId("__nenhum__");
        router.refresh();
      } else {
        alert(data.message ?? "Erro ao vincular");
      }
    } finally {
      setLoading(false);
    }
  }

  async function desvincular(itemContratualId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/atas/${ataId}/itens/${itemContratualId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItens((prev) => prev.filter((i) => i.itemContratual.id !== itemContratualId));
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Itens do contrato vinculados à ata</CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={selectedItemId}
            onValueChange={setSelectedItemId}
            disabled={loadingList || itensDisponiveis.length === 0}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um item para vincular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__nenhum__">Selecione um item</SelectItem>
              {itensDisponiveis.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.modulo.nome} – {i.numeroItem}: {i.descricao.slice(0, 50)}
                  {i.descricao.length > 50 ? "…" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={vincular}
            disabled={selectedItemId === "__nenhum__" || loading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Vincular
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum item vinculado. Use o seletor acima para vincular itens deste contrato.
          </p>
        ) : (
          <ul className="space-y-2">
            {itens.map((iv) => (
              <li
                key={iv.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <Link
                    href={`/itens/${iv.itemContratual.id}`}
                    className="font-medium hover:underline text-primary"
                  >
                    {iv.itemContratual.modulo.nome} – item {iv.itemContratual.numeroItem}
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {iv.itemContratual.descricao}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => desvincular(iv.itemContratual.id)}
                  disabled={loading}
                  title="Desvincular"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
