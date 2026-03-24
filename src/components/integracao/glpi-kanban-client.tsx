"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GlpiKanbanColuna } from "@prisma/client";
import { ORDEM_COLUNAS, GLPI_KANBAN_LABELS } from "@/lib/glpi-kanban-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Chamado = {
  id: string;
  glpiTicketId: number;
  contratoId: string | null;
  fornecedorNome: string | null;
  titulo: string;
  conteudoPreview: string | null;
  statusGlpi: number;
  colunaKanban: GlpiKanbanColuna;
  dataModificacao: string | null;
  contrato?: { id: string; nome: string } | null;
};

type Contrato = { id: string; nome: string; fornecedor: string };

export function GlpiKanbanClient({ contratos }: { contratos: Contrato[] }) {
  const [contratoId, setContratoId] = useState<string>("");
  const [fornecedor, setFornecedor] = useState<string>("");
  const [termo, setTermo] = useState<string>("");
  const [syncTermo, setSyncTermo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [cards, setCards] = useState<Chamado[]>([]);

  async function carregar() {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (contratoId) qs.set("contratoId", contratoId);
      if (fornecedor.trim()) qs.set("fornecedor", fornecedor.trim());
      if (termo.trim()) qs.set("termo", termo.trim());
      const r = await fetch(`/api/integracao/glpi/chamados?${qs.toString()}`);
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.message ?? "Erro ao carregar chamados");
        return;
      }
      setCards(j as Chamado[]);
      setMsg(`${(j as Chamado[]).length} chamado(s) carregado(s).`);
    } finally {
      setLoading(false);
    }
  }

  async function sincronizar() {
    setLoading(true);
    setMsg("");
    try {
      const body: { contratoId?: string; termoTitulo?: string } = {};
      if (contratoId) body.contratoId = contratoId;
      if (!contratoId && syncTermo.trim()) body.termoTitulo = syncTermo.trim();
      const r = await fetch("/api/integracao/glpi/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.message ?? "Erro ao sincronizar");
        return;
      }
      setMsg(`Sincronização concluída: ${j.processados} ticket(s).`);
      await carregar();
    } finally {
      setLoading(false);
    }
  }

  async function mover(glpiTicketId: number, colunaKanban: GlpiKanbanColuna) {
    setMsg("");
    const antes = cards;
    setCards((prev) =>
      prev.map((c) => (c.glpiTicketId === glpiTicketId ? { ...c, colunaKanban } : c))
    );
    const r = await fetch("/api/integracao/glpi/chamados", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ glpiTicketId, colunaKanban }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setCards(antes);
      setMsg(j.message ?? "Falha ao mover chamado");
    }
  }

  const porColuna = useMemo(() => {
    const m = new Map<GlpiKanbanColuna, Chamado[]>();
    ORDEM_COLUNAS.forEach((c) => m.set(c, []));
    for (const card of cards) {
      m.get(card.colunaKanban)?.push(card);
    }
    return m;
  }, [cards]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros e sincronização GLPI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Com <strong>contrato</strong> selecionado, a sincronização usa os{" "}
            <strong>grupos técnicos</strong> vinculados ao contrato (cadastro do contrato). Sem grupos, usa o nome do
            fornecedor no título. Sem contrato, informe o termo de sync. Credenciais em{" "}
            <Link href="/configuracao/glpi" className="text-primary underline">
              Configuração GLPI
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label>Contrato (prioridade: grupos GLPI no cadastro)</Label>
            <Select value={contratoId || "__todos__"} onValueChange={(v) => setContratoId(v === "__todos__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Filtro fornecedor</Label>
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Filtro texto</Label>
            <Input value={termo} onChange={(e) => setTermo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sync por termo (sem contrato)</Label>
            <Input value={syncTermo} onChange={(e) => setSyncTermo(e.target.value)} />
          </div>
          <div className="md:col-span-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={carregar} disabled={loading}>
              Carregar quadro
            </Button>
            <Button onClick={sincronizar} disabled={loading}>
              Sincronizar com GLPI
            </Button>
          </div>
          {msg && <p className="md:col-span-5 text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {ORDEM_COLUNAS.map((col) => (
          <Card key={col} className="min-h-[300px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {GLPI_KANBAN_LABELS[col]} ({porColuna.get(col)?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(porColuna.get(col) ?? []).map((c) => (
                <div key={c.id} className="rounded border p-2 space-y-2 bg-background">
                  <p className="text-sm font-medium">#{c.glpiTicketId} - {c.titulo}</p>
                  {c.contrato?.nome && (
                    <p className="text-xs text-muted-foreground">Contrato: {c.contrato.nome}</p>
                  )}
                  {c.fornecedorNome && (
                    <p className="text-xs text-muted-foreground">Fornecedor: {c.fornecedorNome}</p>
                  )}
                  {c.conteudoPreview && (
                    <p className="text-xs text-muted-foreground">{c.conteudoPreview}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Mover para:</span>
                    <Select
                      value={c.colunaKanban}
                      onValueChange={(v) => mover(c.glpiTicketId, v as GlpiKanbanColuna)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDEM_COLUNAS.map((dest) => (
                          <SelectItem key={dest} value={dest}>
                            {GLPI_KANBAN_LABELS[dest]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
