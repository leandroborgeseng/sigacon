"use client";

import { useEffect, useMemo, useState } from "react";
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
  urgencia: number | null;
  prioridade: number | null;
  categoriaIdGlpi: number | null;
  categoriaNome: string | null;
  grupoTecnicoIdGlpi: number | null;
  grupoTecnicoNome: string | null;
  tecnicoResponsavelIdGlpi: number | null;
  tecnicoResponsavelNome: string | null;
  statusGlpi: number;
  statusLabel: string | null;
  syncStatus: string | null;
  syncErro: string | null;
  ultimoPullEm: string | null;
  ultimoPushEm: string | null;
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
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [edits, setEdits] = useState<
    Record<
      number,
      {
        prioridade: string;
        urgencia: string;
        categoriaIdGlpi: string;
        grupoTecnicoIdGlpi: string;
        tecnicoResponsavelIdGlpi: string;
      }
    >
  >({});

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

  function valorInicialParaEdicao(c: Chamado) {
    return {
      prioridade: c.prioridade == null ? "" : String(c.prioridade),
      urgencia: c.urgencia == null ? "" : String(c.urgencia),
      categoriaIdGlpi: c.categoriaIdGlpi == null ? "" : String(c.categoriaIdGlpi),
      grupoTecnicoIdGlpi: c.grupoTecnicoIdGlpi == null ? "" : String(c.grupoTecnicoIdGlpi),
      tecnicoResponsavelIdGlpi:
        c.tecnicoResponsavelIdGlpi == null ? "" : String(c.tecnicoResponsavelIdGlpi),
    };
  }

  function abrirEdicao(c: Chamado) {
    setEditandoId(c.glpiTicketId);
    setEdits((prev) => ({ ...prev, [c.glpiTicketId]: valorInicialParaEdicao(c) }));
  }

  async function salvarEdicao(c: Chamado) {
    const e = edits[c.glpiTicketId] ?? valorInicialParaEdicao(c);
    const body: Record<string, unknown> = { glpiTicketId: c.glpiTicketId };
    const parseNum = (v: string) => (v.trim() ? Number.parseInt(v.trim(), 10) : undefined);
    const prioridade = parseNum(e.prioridade);
    const urgencia = parseNum(e.urgencia);
    const categoriaIdGlpi = parseNum(e.categoriaIdGlpi);
    const grupoTecnicoIdGlpi = parseNum(e.grupoTecnicoIdGlpi);
    const tecnicoResponsavelIdGlpi = parseNum(e.tecnicoResponsavelIdGlpi);
    if (typeof prioridade === "number" && Number.isFinite(prioridade)) body.prioridade = prioridade;
    if (typeof urgencia === "number" && Number.isFinite(urgencia)) body.urgencia = urgencia;
    if (typeof categoriaIdGlpi === "number" && Number.isFinite(categoriaIdGlpi)) body.categoriaIdGlpi = categoriaIdGlpi;
    if (typeof grupoTecnicoIdGlpi === "number" && Number.isFinite(grupoTecnicoIdGlpi)) body.grupoTecnicoIdGlpi = grupoTecnicoIdGlpi;
    if (typeof tecnicoResponsavelIdGlpi === "number" && Number.isFinite(tecnicoResponsavelIdGlpi)) {
      body.tecnicoResponsavelIdGlpi = tecnicoResponsavelIdGlpi;
    }
    setSavingId(c.glpiTicketId);
    setMsg("");
    try {
      const r = await fetch("/api/integracao/glpi/chamados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as Chamado & { message?: string };
      if (!r.ok) {
        setMsg(j.message ?? "Falha ao atualizar chamado no GLPI");
        return;
      }
      setCards((prev) => prev.map((x) => (x.glpiTicketId === c.glpiTicketId ? { ...x, ...j } : x)));
      setEditandoId(null);
      setMsg(`Chamado #${c.glpiTicketId} atualizado no GLPI.`);
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

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
                  <p className="text-xs text-muted-foreground">
                    {c.statusLabel ?? `Status ${c.statusGlpi}`} | prio {c.prioridade ?? "-"} | urg {c.urgencia ?? "-"}
                  </p>
                  {c.contrato?.nome && (
                    <p className="text-xs text-muted-foreground">Contrato: {c.contrato.nome}</p>
                  )}
                  {c.fornecedorNome && (
                    <p className="text-xs text-muted-foreground">Fornecedor: {c.fornecedorNome}</p>
                  )}
                  {c.conteudoPreview && (
                    <p className="text-xs text-muted-foreground">{c.conteudoPreview}</p>
                  )}
                  {(c.categoriaNome || c.grupoTecnicoNome || c.tecnicoResponsavelNome) && (
                    <p className="text-xs text-muted-foreground">
                      {c.categoriaNome ? `Categoria: ${c.categoriaNome}. ` : ""}
                      {c.grupoTecnicoNome ? `Grupo: ${c.grupoTecnicoNome}. ` : ""}
                      {c.tecnicoResponsavelNome ? `Técnico: ${c.tecnicoResponsavelNome}.` : ""}
                    </p>
                  )}
                  {c.syncStatus && (
                    <p className="text-xs text-muted-foreground">
                      Sync: {c.syncStatus}
                      {c.ultimoPullEm ? ` | pull: ${new Date(c.ultimoPullEm).toLocaleString("pt-BR")}` : ""}
                      {c.ultimoPushEm ? ` | push: ${new Date(c.ultimoPushEm).toLocaleString("pt-BR")}` : ""}
                    </p>
                  )}
                  {c.syncErro && <p className="text-xs text-destructive line-clamp-2">Último erro: {c.syncErro}</p>}
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
                  {editandoId === c.glpiTicketId ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input
                        type="number"
                        placeholder="Prioridade"
                        value={edits[c.glpiTicketId]?.prioridade ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: { ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)), prioridade: e.target.value },
                          }))
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Urgência"
                        value={edits[c.glpiTicketId]?.urgencia ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: { ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)), urgencia: e.target.value },
                          }))
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Categoria ID"
                        value={edits[c.glpiTicketId]?.categoriaIdGlpi ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              categoriaIdGlpi: e.target.value,
                            },
                          }))
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Grupo técnico ID"
                        value={edits[c.glpiTicketId]?.grupoTecnicoIdGlpi ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              grupoTecnicoIdGlpi: e.target.value,
                            },
                          }))
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Técnico ID"
                        value={edits[c.glpiTicketId]?.tecnicoResponsavelIdGlpi ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              tecnicoResponsavelIdGlpi: e.target.value,
                            },
                          }))
                        }
                        className="h-8 text-xs col-span-2"
                      />
                      <div className="col-span-2 flex gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={savingId === c.glpiTicketId}
                          onClick={() => void salvarEdicao(c)}
                        >
                          {savingId === c.glpiTicketId ? "Salvando..." : "Salvar no GLPI"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8"
                          disabled={savingId === c.glpiTicketId}
                          onClick={() => setEditandoId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => abrirEdicao(c)}>
                      Editar campos GLPI
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
