"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { StatusMeta } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GestaoSwitcher } from "@/components/gestao/gestao-switcher";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { ListLoadingSkeleton } from "@/components/ui/list-loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<StatusMeta, string> = {
  [StatusMeta.NAO_INICIADA]: "Não iniciada",
  [StatusMeta.EM_ANDAMENTO]: "Em andamento",
  [StatusMeta.CONCLUIDA]: "Concluída",
  [StatusMeta.BLOQUEADA]: "Bloqueada",
};

type GlpiChamadoLite = {
  id: string;
  glpiTicketId: number;
  titulo: string;
};

type Desdobramento = {
  id: string;
  metaId: string;
  titulo: string;
  descricao: string | null;
  responsavel: string | null;
  status: StatusMeta;
  percentualConcluido: number;
  prazoInicio: string | null;
  prazoFim: string | null;
  chamados: Array<{ glpiChamadoId: string; glpiChamado: GlpiChamadoLite }>;
};

type Meta = {
  id: string;
  ano: number;
  titulo: string;
  descricao: string | null;
  contextoOrigem: string | null;
  status: StatusMeta;
  prazo: string | null;
  desdobramentos: Desdobramento[];
};

type DesdobramentoDraft = {
  titulo: string;
  descricao: string;
  responsavel: string;
  percentualConcluido: string;
  status: StatusMeta;
  glpiChamadoIds: string[];
};

const EMPTY_DRAFT: DesdobramentoDraft = {
  titulo: "",
  descricao: "",
  responsavel: "",
  percentualConcluido: "0",
  status: StatusMeta.NAO_INICIADA,
  glpiChamadoIds: [],
};

const NOVA_META_VAZIA = {
  titulo: "",
  descricao: "",
  contextoOrigem: "Questionário IEGM/iGOV-TI para o exercício de 2026 (preenchimento até 31/03/2027).",
  prazo: "",
};

function toDateInput(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function MetasClient({ podeEditar, embedded = false }: { podeEditar: boolean; embedded?: boolean }) {
  const [ano, setAno] = useState(2026);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [glpiChamados, setGlpiChamados] = useState<GlpiChamadoLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusMeta>("TODOS");
  const [filtroResponsavel, setFiltroResponsavel] = useState("TODOS");
  const [modoVisao, setModoVisao] = useState<"TABELA" | "KANBAN">("TABELA");

  const [novaMeta, setNovaMeta] = useState({ ...NOVA_META_VAZIA });
  const [novaMetaModalAberto, setNovaMetaModalAberto] = useState(false);

  const [novoDesdobramento, setNovoDesdobramento] = useState<Record<string, DesdobramentoDraft>>({});

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch(`/api/metas?ano=${ano}`);
      const data = await r.json();
      if (!r.ok) {
        setErro(data.message ?? "Erro ao carregar metas");
        return;
      }
      setMetas(data.metas ?? []);
      setGlpiChamados(data.glpiChamados ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [ano]);

  useEffect(() => {
    if (novaMetaModalAberto) {
      setNovaMeta({ ...NOVA_META_VAZIA });
    }
  }, [novaMetaModalAberto]);

  const chamadosOptions = useMemo(
    () => glpiChamados.map((c) => ({ value: c.id, label: `#${c.glpiTicketId} - ${c.titulo}` })),
    [glpiChamados]
  );

  const responsaveisOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of metas) {
      for (const d of m.desdobramentos) {
        const r = d.responsavel?.trim();
        if (r) s.add(r);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [metas]);

  const metasFiltradas = useMemo(() => {
    return metas.map((m) => ({
      ...m,
      desdobramentos: m.desdobramentos.filter((d) => {
        const okStatus = filtroStatus === "TODOS" || d.status === filtroStatus;
        const okResp = filtroResponsavel === "TODOS" || (d.responsavel?.trim() || "") === filtroResponsavel;
        return okStatus && okResp;
      }),
    }));
  }, [metas, filtroStatus, filtroResponsavel]);

  const indicadores = useMemo(() => {
    const des = metas.flatMap((m) => m.desdobramentos);
    return {
      totalMetas: metas.length,
      totalDesdobramentos: des.length,
      totalConcluidos: des.filter((d) => d.status === StatusMeta.CONCLUIDA).length,
      percMedio: des.length ? des.reduce((a, d) => a + d.percentualConcluido, 0) / des.length : 0,
    };
  }, [metas]);

  const kanban = useMemo(() => {
    const out: Record<StatusMeta, Array<{ metaTitulo: string; d: Desdobramento }>> = {
      [StatusMeta.NAO_INICIADA]: [],
      [StatusMeta.EM_ANDAMENTO]: [],
      [StatusMeta.CONCLUIDA]: [],
      [StatusMeta.BLOQUEADA]: [],
    };
    for (const m of metasFiltradas) {
      for (const d of m.desdobramentos) out[d.status].push({ metaTitulo: m.titulo, d });
    }
    return out;
  }, [metasFiltradas]);

  async function baixar(formato: "csv" | "ods") {
    const r = await fetch(`/api/metas/export?ano=${ano}&formato=${formato}`);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = (data as { message?: string }).message ?? "Erro ao exportar metas";
      setErro(msg);
      toast({ variant: "destructive", title: "Erro na exportação", description: msg });
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metas-${ano}.${formato}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ variant: "success", title: "Exportação concluída", description: `metas-${ano}.${formato}` });
  }

  async function bootstrap2026() {
    if (!podeEditar) return;
    const r = await fetch("/api/metas/bootstrap-2026", { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.message ?? "Falha ao carregar metas-base");
      toast({
        variant: "destructive",
        title: "Falha ao carregar metas-base",
        description: data.message,
      });
      return;
    }
    await carregar();
    toast({ variant: "success", title: "Metas-base carregadas" });
  }

  async function criarMeta() {
    if (!podeEditar) return;
    const r = await fetch("/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ano,
        titulo: novaMeta.titulo,
        descricao: novaMeta.descricao || null,
        contextoOrigem: novaMeta.contextoOrigem || null,
        prazo: novaMeta.prazo || null,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.message ?? "Erro ao criar meta");
      toast({
        variant: "destructive",
        title: "Erro ao criar meta",
        description: data.message,
      });
      return;
    }
    setNovaMeta({ ...NOVA_META_VAZIA });
    setNovaMetaModalAberto(false);
    await carregar();
    toast({ variant: "success", title: "Meta criada" });
  }

  async function salvarMeta(meta: Meta) {
    if (!podeEditar) return;
    const r = await fetch(`/api/metas/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: meta.titulo,
        descricao: meta.descricao,
        contextoOrigem: meta.contextoOrigem,
        status: meta.status,
        prazo: meta.prazo || null,
      }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = (data as { message?: string }).message ?? "Erro ao salvar meta";
      setErro(msg);
      toast({ variant: "destructive", title: "Erro ao salvar meta", description: msg });
      return;
    }
    await carregar();
    toast({ variant: "success", title: "Meta salva" });
  }

  async function excluirMeta(metaId: string) {
    if (!podeEditar) return;
    if (!confirm("Excluir esta meta e todos os desdobramentos?")) return;
    const r = await fetch(`/api/metas/${metaId}`, { method: "DELETE" });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = (data as { message?: string }).message ?? "Erro ao excluir meta";
      setErro(msg);
      toast({ variant: "destructive", title: "Erro ao excluir", description: msg });
      return;
    }
    if (expandedMetaId === metaId) setExpandedMetaId(null);
    await carregar();
    toast({ variant: "success", title: "Meta excluída" });
  }

  function defaultsDesdobramento(metaId: string): DesdobramentoDraft {
    return novoDesdobramento[metaId] ?? EMPTY_DRAFT;
  }

  function patchNovoDesdobramento(metaId: string, partial: Partial<DesdobramentoDraft>) {
    setNovoDesdobramento((p) => ({ ...p, [metaId]: { ...defaultsDesdobramento(metaId), ...partial } }));
  }

  async function criarDesdobramento(metaId: string) {
    if (!podeEditar) return;
    const d = defaultsDesdobramento(metaId);
    const r = await fetch("/api/metas/desdobramentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metaId,
        titulo: d.titulo,
        descricao: d.descricao || null,
        responsavel: d.responsavel || null,
        status: d.status,
        percentualConcluido: Number(d.percentualConcluido || 0),
        prazoInicio: null,
        prazoFim: null,
        glpiChamadoIds: d.glpiChamadoIds,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.message ?? "Erro ao criar desdobramento");
      toast({
        variant: "destructive",
        title: "Erro ao criar desdobramento",
        description: data.message,
      });
      return;
    }
    setNovoDesdobramento((p) => ({ ...p, [metaId]: { ...EMPTY_DRAFT } }));
    await carregar();
    toast({ variant: "success", title: "Desdobramento adicionado" });
  }

  async function salvarDesdobramento(des: Desdobramento) {
    if (!podeEditar) return;
    const r = await fetch(`/api/metas/desdobramentos/${des.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: des.titulo,
        descricao: des.descricao,
        responsavel: des.responsavel,
        status: des.status,
        percentualConcluido: des.percentualConcluido,
        glpiChamadoIds: des.chamados.map((c) => c.glpiChamadoId),
      }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = (data as { message?: string }).message ?? "Erro ao salvar desdobramento";
      setErro(msg);
      toast({ variant: "destructive", title: "Erro ao salvar", description: msg });
      return;
    }
    await carregar();
    toast({ variant: "success", title: "Desdobramento salvo" });
  }

  async function excluirDesdobramento(id: string) {
    if (!podeEditar) return;
    if (!confirm("Excluir desdobramento?")) return;
    const r = await fetch(`/api/metas/desdobramentos/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const msg = (data as { message?: string }).message ?? "Erro ao excluir desdobramento";
      setErro(msg);
      toast({ variant: "destructive", title: "Erro ao excluir", description: msg });
      return;
    }
    await carregar();
    toast({ variant: "success", title: "Desdobramento excluído" });
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Plano de metas e desdobramentos com vínculo aos chamados GLPI.</p>
          <div className="mt-3">
            <GestaoSwitcher atual="metas" />
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo do exercício</CardTitle>
          <p className="text-sm text-muted-foreground">
            Indicadores do ano <span className="font-medium text-foreground">{ano}</span> (todas as metas carregadas, independente dos filtros abaixo).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Metas</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalMetas}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Desdobramentos</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalDesdobramentos}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalConcluidos}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">% médio</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.percMedio.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ano, exportação e filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="w-32 space-y-1">
              <Label>Ano</Label>
              <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value || 2026))} />
            </div>
            <Button variant="outline" onClick={() => void carregar()} disabled={loading}>
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => baixar("csv")}>
              CSV
            </Button>
            <Button variant="outline" onClick={() => baixar("ods")}>
              ODS
            </Button>
            {podeEditar && (
              <Button variant="secondary" onClick={bootstrap2026}>
                Carregar metas-base 2026
              </Button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Status (desdobramento)</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as "TODOS" | StatusMeta)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {Object.values(StatusMeta).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {responsaveisOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visualização</Label>
              <Select value={modoVisao} onValueChange={(v) => setModoVisao(v as "TABELA" | "KANBAN")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TABELA">Tabela colapsada</SelectItem>
                  <SelectItem value="KANBAN">Kanban</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      {modoVisao === "KANBAN" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Metas — Kanban</CardTitle>
            <p className="text-sm text-muted-foreground">
              Desdobramentos por status (respeitam os filtros de status e responsável).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.values(StatusMeta).map((status) => (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {STATUS_LABEL[status]} ({kanban[status].length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[min(60vh,480px)] space-y-2 overflow-y-auto">
                    {kanban[status].length === 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/15 py-8 text-center text-xs text-muted-foreground">
                        Nenhum desdobramento neste status com os filtros atuais.
                      </div>
                    ) : (
                      kanban[status].map(({ metaTitulo, d }) => (
                        <div
                          key={d.id}
                          className="space-y-1 rounded-md border border-l-4 border-l-primary/40 bg-card p-2.5 shadow-sm"
                        >
                          <p className="text-[11px] font-medium text-muted-foreground">{metaTitulo}</p>
                          <p className="text-sm font-medium leading-tight">{d.titulo}</p>
                          <p className="text-xs text-muted-foreground">{d.percentualConcluido}% concluído</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modoVisao === "TABELA" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas</CardTitle>
            <p className="text-sm text-muted-foreground">Clique em uma linha para expandir e editar desdobramentos.</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading && metas.length === 0 ? (
              <ListLoadingSkeleton linhas={8} />
            ) : null}
            {!loading && metas.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Target}
                  title="Nenhuma meta para exibir"
                  description="Ajuste o ano ou use o botão Nova meta abaixo. Para começar o exercício, use “Carregar metas-base 2026” nos filtros."
                />
              </div>
            ) : null}
            {metas.length > 0 ? (
            <Table stickyHeader scrollMaxHeight="min(65vh, 36rem)">
              <TableHeader>
                <TableRow>
                  <TableHead>Meta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Desdobramentos</TableHead>
                  <TableHead>% médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasFiltradas.map((m) => {
                  const media = m.desdobramentos.length ? m.desdobramentos.reduce((a, d) => a + d.percentualConcluido, 0) / m.desdobramentos.length : 0;
                  const open = expandedMetaId === m.id;
                  return (
                    <Fragment key={m.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandedMetaId(open ? null : m.id)}>
                        <TableCell className="font-medium">{m.titulo}</TableCell>
                        <TableCell><Badge variant={m.status === StatusMeta.CONCLUIDA ? "success" : m.status === StatusMeta.BLOQUEADA ? "warning" : "secondary"}>{STATUS_LABEL[m.status]}</Badge></TableCell>
                        <TableCell>{toDateInput(m.prazo) || "-"}</TableCell>
                        <TableCell>{m.desdobramentos.length}</TableCell>
                        <TableCell>{media.toFixed(1)}%</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="space-y-3 py-2">
                              <Textarea value={m.descricao ?? ""} onChange={(e) => setMetas((prev) => prev.map((x) => x.id === m.id ? { ...x, descricao: e.target.value } : x))} placeholder="Descrição da meta" disabled={!podeEditar} />
                              <div className="flex flex-wrap gap-2">
                                <Select value={m.status} onValueChange={(v) => setMetas((prev) => prev.map((x) => x.id === m.id ? { ...x, status: v as StatusMeta } : x))} disabled={!podeEditar}>
                                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Object.values(StatusMeta).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input className="w-[180px]" type="date" value={toDateInput(m.prazo)} onChange={(e) => setMetas((prev) => prev.map((x) => x.id === m.id ? { ...x, prazo: e.target.value || null } : x))} disabled={!podeEditar} />
                                {podeEditar && <Button variant="outline" onClick={() => salvarMeta(m)}>Salvar meta</Button>}
                                {podeEditar && <Button variant="destructive" onClick={() => excluirMeta(m.id)}>Excluir meta</Button>}
                              </div>

                              <div className="space-y-2 border-t pt-3">
                                <p className="text-sm font-medium">Desdobramentos</p>
                                {m.desdobramentos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum desdobramento após filtros.</p>}
                                {m.desdobramentos.map((d) => (
                                  <div key={d.id} className="rounded border p-2 space-y-2">
                                    <Input value={d.titulo} onChange={(e) => setMetas((prev) => prev.map((x) => x.id !== m.id ? x : { ...x, desdobramentos: x.desdobramentos.map((y) => y.id === d.id ? { ...y, titulo: e.target.value } : y) }))} disabled={!podeEditar} />
                                    <div className="grid gap-2 md:grid-cols-4">
                                      <Input placeholder="Responsável" value={d.responsavel ?? ""} onChange={(e) => setMetas((prev) => prev.map((x) => x.id !== m.id ? x : { ...x, desdobramentos: x.desdobramentos.map((y) => y.id === d.id ? { ...y, responsavel: e.target.value } : y) }))} disabled={!podeEditar} />
                                      <Select value={d.status} onValueChange={(v) => setMetas((prev) => prev.map((x) => x.id !== m.id ? x : { ...x, desdobramentos: x.desdobramentos.map((y) => y.id === d.id ? { ...y, status: v as StatusMeta } : y) }))} disabled={!podeEditar}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.values(StatusMeta).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                                      </Select>
                                      <Input type="number" min={0} max={100} value={d.percentualConcluido} onChange={(e) => setMetas((prev) => prev.map((x) => x.id !== m.id ? x : { ...x, desdobramentos: x.desdobramentos.map((y) => y.id === d.id ? { ...y, percentualConcluido: Number(e.target.value || 0) } : y) }))} disabled={!podeEditar} />
                                      {podeEditar && <Button variant="outline" onClick={() => salvarDesdobramento(d)}>Salvar</Button>}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {d.chamados.map((c) => <Badge key={c.glpiChamadoId} variant="outline">#{c.glpiChamado.glpiTicketId} {c.glpiChamado.titulo}</Badge>)}
                                    </div>
                                    {podeEditar && <Button variant="destructive" size="sm" onClick={() => excluirDesdobramento(d.id)}>Excluir desdobramento</Button>}
                                  </div>
                                ))}

                                {podeEditar && (
                                  <div className="rounded-md border border-dashed p-3 space-y-2">
                                    <p className="text-sm font-medium">Novo desdobramento</p>
                                    <Input placeholder="Título" value={defaultsDesdobramento(m.id).titulo} onChange={(e) => patchNovoDesdobramento(m.id, { titulo: e.target.value })} />
                                    <Textarea placeholder="Descrição" value={defaultsDesdobramento(m.id).descricao} onChange={(e) => patchNovoDesdobramento(m.id, { descricao: e.target.value })} />
                                    <div className="grid md:grid-cols-3 gap-2">
                                      <Input placeholder="Responsável" value={defaultsDesdobramento(m.id).responsavel} onChange={(e) => patchNovoDesdobramento(m.id, { responsavel: e.target.value })} />
                                      <Select value={defaultsDesdobramento(m.id).status} onValueChange={(v) => patchNovoDesdobramento(m.id, { status: v as StatusMeta })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{Object.values(StatusMeta).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                                      </Select>
                                      <Input type="number" min={0} max={100} value={defaultsDesdobramento(m.id).percentualConcluido} onChange={(e) => patchNovoDesdobramento(m.id, { percentualConcluido: e.target.value })} />
                                    </div>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 rounded-md border p-2 max-h-32 overflow-auto">
                                      {chamadosOptions.map((opt) => {
                                        const checked = defaultsDesdobramento(m.id).glpiChamadoIds.includes(opt.value);
                                        return (
                                          <label key={opt.value} className="flex gap-2 items-start text-xs cursor-pointer">
                                            <input type="checkbox" checked={checked} onChange={(e) => {
                                              const ids = new Set(defaultsDesdobramento(m.id).glpiChamadoIds);
                                              if (e.target.checked) ids.add(opt.value); else ids.delete(opt.value);
                                              patchNovoDesdobramento(m.id, { glpiChamadoIds: [...ids] });
                                            }} />
                                            <span>{opt.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <Button onClick={() => criarDesdobramento(m.id)}>Adicionar desdobramento</Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            ) : null}
          </CardContent>
        </Card>
      )}

      {podeEditar && (
        <div className="flex flex-col items-stretch gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Incluir nova meta no ano {ano}.</p>
          <Button type="button" className="sm:w-auto" onClick={() => setNovaMetaModalAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova meta
          </Button>
        </div>
      )}

      <Dialog open={novaMetaModalAberto} onOpenChange={setNovaMetaModalAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showClose>
          <DialogHeader>
            <DialogTitle>Nova meta</DialogTitle>
            <DialogDescription>
              A meta será criada para o ano {ano}. Depois você poderá adicionar desdobramentos na tabela.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="nova-meta-titulo">Título</Label>
              <Input
                id="nova-meta-titulo"
                placeholder="Título da meta"
                value={novaMeta.titulo}
                onChange={(e) => setNovaMeta((v) => ({ ...v, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nova-meta-desc">Descrição (opcional)</Label>
              <Textarea
                id="nova-meta-desc"
                placeholder="Descrição"
                value={novaMeta.descricao}
                onChange={(e) => setNovaMeta((v) => ({ ...v, descricao: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nova-meta-ctx">Contexto de origem (opcional)</Label>
              <Textarea
                id="nova-meta-ctx"
                placeholder="Ex.: IEGM, edital, planejamento…"
                value={novaMeta.contextoOrigem}
                onChange={(e) => setNovaMeta((v) => ({ ...v, contextoOrigem: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nova-meta-prazo">Prazo (opcional)</Label>
              <Input
                id="nova-meta-prazo"
                type="date"
                value={novaMeta.prazo}
                onChange={(e) => setNovaMeta((v) => ({ ...v, prazo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setNovaMetaModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void criarMeta()} disabled={!novaMeta.titulo.trim()}>
              Criar meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
