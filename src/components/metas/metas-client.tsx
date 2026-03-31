"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusMeta } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  colunaKanban: string;
  statusLabel: string | null;
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

function toDateInput(v: string | null | undefined): string {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

type DesdobramentoDraft = {
  titulo: string;
  descricao: string;
  responsavel: string;
  prazoInicio: string;
  prazoFim: string;
  percentualConcluido: string;
  status: StatusMeta;
  glpiChamadoIds: string[];
};

const EMPTY_DRAFT: DesdobramentoDraft = {
  titulo: "",
  descricao: "",
  responsavel: "",
  prazoInicio: "",
  prazoFim: "",
  percentualConcluido: "0",
  status: StatusMeta.NAO_INICIADA,
  glpiChamadoIds: [],
};

export function MetasClient({ podeEditar }: { podeEditar: boolean }) {
  const [ano, setAno] = useState(2026);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [glpiChamados, setGlpiChamados] = useState<GlpiChamadoLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusMeta>("TODOS");
  const [filtroResponsavel, setFiltroResponsavel] = useState("TODOS");
  const [modoVisao, setModoVisao] = useState<"LISTA" | "KANBAN">("LISTA");

  const [novaMeta, setNovaMeta] = useState({
    titulo: "",
    descricao: "",
    contextoOrigem: "Questionário IEGM/iGOV-TI para o exercício de 2026 (preenchimento até 31/03/2027).",
    prazo: "",
  });

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

  const chamadosOptions = useMemo(
    () =>
      glpiChamados.map((c) => ({
        value: c.id,
        label: `#${c.glpiTicketId} - ${c.titulo}`,
      })),
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
        const okResp =
          filtroResponsavel === "TODOS" || (d.responsavel?.trim() || "") === filtroResponsavel;
        return okStatus && okResp;
      }),
    }));
  }, [metas, filtroStatus, filtroResponsavel]);

  const desdobramentosAno = useMemo(
    () => metas.flatMap((m) => m.desdobramentos),
    [metas]
  );

  const indicadores = useMemo(() => {
    const totalMetas = metas.length;
    const totalDesdobramentos = desdobramentosAno.length;
    const totalConcluidos = desdobramentosAno.filter((d) => d.status === StatusMeta.CONCLUIDA).length;
    const percMedio =
      totalDesdobramentos > 0
        ? desdobramentosAno.reduce((acc, d) => acc + d.percentualConcluido, 0) / totalDesdobramentos
        : 0;
    const metasConcluidas = metas.filter((m) => m.status === StatusMeta.CONCLUIDA).length;
    return {
      totalMetas,
      totalDesdobramentos,
      totalConcluidos,
      metasConcluidas,
      percMedio,
    };
  }, [metas, desdobramentosAno]);

  const kanban = useMemo(() => {
    const out: Record<StatusMeta, Array<{ metaTitulo: string; desdobramento: Desdobramento }>> = {
      [StatusMeta.NAO_INICIADA]: [],
      [StatusMeta.EM_ANDAMENTO]: [],
      [StatusMeta.CONCLUIDA]: [],
      [StatusMeta.BLOQUEADA]: [],
    };
    for (const m of metasFiltradas) {
      for (const d of m.desdobramentos) {
        out[d.status].push({ metaTitulo: m.titulo, desdobramento: d });
      }
    }
    return out;
  }, [metasFiltradas]);

  async function baixar(formato: "csv" | "ods") {
    const r = await fetch(`/api/metas/export?ano=${ano}&formato=${formato}`);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErro((data as { message?: string }).message ?? "Erro ao exportar metas");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metas-${ano}.${formato}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function bootstrap2026() {
    if (!podeEditar) return;
    const r = await fetch("/api/metas/bootstrap-2026", { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.message ?? "Falha ao carregar metas-base");
      return;
    }
    await carregar();
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
      return;
    }
    setNovaMeta((v) => ({ ...v, titulo: "", descricao: "", prazo: "" }));
    await carregar();
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
      setErro((data as { message?: string }).message ?? "Erro ao salvar meta");
      return;
    }
    await carregar();
  }

  async function excluirMeta(metaId: string) {
    if (!podeEditar) return;
    const ok = confirm("Excluir esta meta e todos os desdobramentos?");
    if (!ok) return;
    const r = await fetch(`/api/metas/${metaId}`, { method: "DELETE" });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErro((data as { message?: string }).message ?? "Erro ao excluir meta");
      return;
    }
    await carregar();
  }

  function defaultsDesdobramento(metaId: string): DesdobramentoDraft {
    return novoDesdobramento[metaId] ?? EMPTY_DRAFT;
  }

  function patchNovoDesdobramento(metaId: string, partial: Partial<DesdobramentoDraft>) {
    const cur = defaultsDesdobramento(metaId);
    setNovoDesdobramento((p) => ({ ...p, [metaId]: { ...cur, ...partial } }));
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
        prazoInicio: d.prazoInicio || null,
        prazoFim: d.prazoFim || null,
        glpiChamadoIds: d.glpiChamadoIds,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.message ?? "Erro ao criar desdobramento");
      return;
    }
    setNovoDesdobramento((p) => ({ ...p, [metaId]: { ...EMPTY_DRAFT } }));
    await carregar();
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
        prazoInicio: des.prazoInicio,
        prazoFim: des.prazoFim,
        glpiChamadoIds: des.chamados.map((c) => c.glpiChamadoId),
      }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErro((data as { message?: string }).message ?? "Erro ao salvar desdobramento");
      return;
    }
    await carregar();
  }

  async function excluirDesdobramento(id: string) {
    if (!podeEditar) return;
    const ok = confirm("Excluir desdobramento?");
    if (!ok) return;
    const r = await fetch(`/api/metas/desdobramentos/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErro((data as { message?: string }).message ?? "Erro ao excluir desdobramento");
      return;
    }
    await carregar();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
        <p className="text-muted-foreground">
          Plano de metas e desdobramentos com vínculo aos chamados GLPI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planejamento anual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="w-32 space-y-1">
              <Label>Ano</Label>
              <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value || 2026))} />
            </div>
            <Button variant="outline" onClick={carregar} disabled={loading}>Atualizar</Button>
            <Button variant="outline" onClick={() => baixar("csv")}>Exportar CSV</Button>
            <Button variant="outline" onClick={() => baixar("ods")}>Exportar ODS</Button>
            {podeEditar && <Button onClick={bootstrap2026}>Carregar metas-base 2026</Button>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Metas no ano</p>
                <p className="text-2xl font-bold">{indicadores.totalMetas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Desdobramentos</p>
                <p className="text-2xl font-bold">{indicadores.totalDesdobramentos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold">{indicadores.totalConcluidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Percentual médio</p>
                <p className="text-2xl font-bold">{indicadores.percMedio.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Filtro por status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as "TODOS" | StatusMeta)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {Object.values(StatusMeta).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Filtro por responsável</Label>
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {responsaveisOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visualização</Label>
              <Select value={modoVisao} onValueChange={(v) => setModoVisao(v as "LISTA" | "KANBAN") }>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LISTA">Lista</SelectItem>
                  <SelectItem value="KANBAN">Kanban</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
      </Card>

      {modoVisao === "KANBAN" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(StatusMeta).map((status) => (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="text-sm">
                  {STATUS_LABEL[status]} ({kanban[status].length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kanban[status].length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem desdobramentos.</p>
                ) : (
                  kanban[status].map(({ metaTitulo, desdobramento }) => (
                    <div key={desdobramento.id} className="rounded border p-2 space-y-1">
                      <p className="text-[11px] text-muted-foreground">{metaTitulo}</p>
                      <p className="text-sm font-medium leading-tight">{desdobramento.titulo}</p>
                      <p className="text-xs">{desdobramento.percentualConcluido}%</p>
                      {desdobramento.responsavel && (
                        <Badge variant="outline" className="text-[10px]">{desdobramento.responsavel}</Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {podeEditar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova meta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Input placeholder="Título da meta" value={novaMeta.titulo} onChange={(e) => setNovaMeta((v) => ({ ...v, titulo: e.target.value }))} />
            <Textarea placeholder="Descrição (opcional)" value={novaMeta.descricao} onChange={(e) => setNovaMeta((v) => ({ ...v, descricao: e.target.value }))} />
            <Textarea placeholder="Contexto de origem (opcional)" value={novaMeta.contextoOrigem} onChange={(e) => setNovaMeta((v) => ({ ...v, contextoOrigem: e.target.value }))} />
            <div className="flex gap-2 items-end">
              <div className="w-44 space-y-1">
                <Label>Prazo</Label>
                <Input type="date" value={novaMeta.prazo} onChange={(e) => setNovaMeta((v) => ({ ...v, prazo: e.target.value }))} />
              </div>
              <Button onClick={criarMeta}>Criar meta</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modoVisao === "LISTA" && (
        <div className="space-y-4">
          {metasFiltradas.map((meta) => (
            <Card key={meta.id}>
              <CardHeader>
                <div className="flex flex-wrap gap-2 items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-[260px]">
                    <Input
                      value={meta.titulo}
                      onChange={(e) => setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, titulo: e.target.value } : m)))}
                      disabled={!podeEditar}
                      className="font-semibold"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Ano {meta.ano}</Badge>
                      <Badge variant={meta.status === StatusMeta.CONCLUIDA ? "success" : meta.status === StatusMeta.BLOQUEADA ? "warning" : "secondary"}>
                        {STATUS_LABEL[meta.status]}
                      </Badge>
                    </div>
                  </div>
                  {podeEditar && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => salvarMeta(meta)}>Salvar meta</Button>
                      <Button variant="destructive" onClick={() => excluirMeta(meta.id)}>Excluir</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={meta.descricao ?? ""}
                  onChange={(e) => setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, descricao: e.target.value } : m)))}
                  placeholder="Descrição da meta"
                  disabled={!podeEditar}
                />
                <Textarea
                  value={meta.contextoOrigem ?? ""}
                  onChange={(e) => setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, contextoOrigem: e.target.value } : m)))}
                  placeholder="Contexto da meta"
                  disabled={!podeEditar}
                />
                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={meta.status}
                      onValueChange={(v) => setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, status: v as StatusMeta } : m)))}
                      disabled={!podeEditar}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(StatusMeta).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Prazo da meta</Label>
                    <Input type="date" value={toDateInput(meta.prazo)} onChange={(e) => setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, prazo: e.target.value || null } : m)))} disabled={!podeEditar} />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <p className="font-medium">Desdobramentos</p>
                  {meta.desdobramentos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum desdobramento após filtros.</p>
                  )}

                  {meta.desdobramentos.map((des) => (
                    <div key={des.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex flex-wrap gap-2 items-start justify-between">
                        <Input
                          value={des.titulo}
                          onChange={(e) =>
                            setMetas((prev) =>
                              prev.map((m) =>
                                m.id !== meta.id
                                  ? m
                                  : {
                                      ...m,
                                      desdobramentos: m.desdobramentos.map((d) => (d.id === des.id ? { ...d, titulo: e.target.value } : d)),
                                    }
                              )
                            )
                          }
                          disabled={!podeEditar}
                          className="max-w-2xl"
                        />
                        {podeEditar && (
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => salvarDesdobramento(des)}>Salvar</Button>
                            <Button variant="destructive" onClick={() => excluirDesdobramento(des.id)}>Excluir</Button>
                          </div>
                        )}
                      </div>
                      <Textarea
                        value={des.descricao ?? ""}
                        onChange={(e) =>
                          setMetas((prev) =>
                            prev.map((m) =>
                              m.id !== meta.id
                                ? m
                                : {
                                    ...m,
                                    desdobramentos: m.desdobramentos.map((d) => (d.id === des.id ? { ...d, descricao: e.target.value } : d)),
                                  }
                            )
                          )
                        }
                        placeholder="Descrição do desdobramento"
                        disabled={!podeEditar}
                      />
                      <div className="grid md:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label>Responsável</Label>
                          <Input
                            value={des.responsavel ?? ""}
                            onChange={(e) =>
                              setMetas((prev) =>
                                prev.map((m) =>
                                  m.id !== meta.id
                                    ? m
                                    : {
                                        ...m,
                                        desdobramentos: m.desdobramentos.map((d) => (d.id === des.id ? { ...d, responsavel: e.target.value } : d)),
                                      }
                                )
                              )
                            }
                            disabled={!podeEditar}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <Select
                            value={des.status}
                            onValueChange={(v) =>
                              setMetas((prev) =>
                                prev.map((m) =>
                                  m.id !== meta.id
                                    ? m
                                    : {
                                        ...m,
                                        desdobramentos: m.desdobramentos.map((d) => (d.id === des.id ? { ...d, status: v as StatusMeta } : d)),
                                      }
                                )
                              )
                            }
                            disabled={!podeEditar}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.values(StatusMeta).map((s) => (
                                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>% concluído</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={des.percentualConcluido}
                            onChange={(e) =>
                              setMetas((prev) =>
                                prev.map((m) =>
                                  m.id !== meta.id
                                    ? m
                                    : {
                                        ...m,
                                        desdobramentos: m.desdobramentos.map((d) =>
                                          d.id === des.id ? { ...d, percentualConcluido: Number(e.target.value || 0) } : d
                                        ),
                                      }
                                )
                              )
                            }
                            disabled={!podeEditar}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Chamados GLPI vinculados</Label>
                        <div className="flex flex-wrap gap-1">
                          {des.chamados.map((c) => (
                            <Badge key={c.glpiChamadoId} variant="outline">
                              #{c.glpiChamado.glpiTicketId} {c.glpiChamado.titulo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {podeEditar && (
                    <div className="rounded-md border border-dashed p-3 space-y-2">
                      <p className="text-sm font-medium">Novo desdobramento</p>
                      <Input placeholder="Título" value={defaultsDesdobramento(meta.id).titulo} onChange={(e) => patchNovoDesdobramento(meta.id, { titulo: e.target.value })} />
                      <Textarea placeholder="Descrição" value={defaultsDesdobramento(meta.id).descricao} onChange={(e) => patchNovoDesdobramento(meta.id, { descricao: e.target.value })} />
                      <div className="grid md:grid-cols-4 gap-2">
                        <Input placeholder="Responsável" value={defaultsDesdobramento(meta.id).responsavel} onChange={(e) => patchNovoDesdobramento(meta.id, { responsavel: e.target.value })} />
                        <Select value={defaultsDesdobramento(meta.id).status} onValueChange={(v) => patchNovoDesdobramento(meta.id, { status: v as StatusMeta })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.values(StatusMeta).map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} max={100} placeholder="%" value={defaultsDesdobramento(meta.id).percentualConcluido} onChange={(e) => patchNovoDesdobramento(meta.id, { percentualConcluido: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <Label>Vincular chamados GLPI</Label>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 rounded-md border p-2 max-h-40 overflow-auto">
                          {chamadosOptions.map((opt) => {
                            const checked = defaultsDesdobramento(meta.id).glpiChamadoIds.includes(opt.value);
                            return (
                              <label key={opt.value} className="flex gap-2 items-start text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const ids = new Set(defaultsDesdobramento(meta.id).glpiChamadoIds);
                                    if (e.target.checked) ids.add(opt.value);
                                    else ids.delete(opt.value);
                                    patchNovoDesdobramento(meta.id, { glpiChamadoIds: [...ids] });
                                  }}
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <Button onClick={() => criarDesdobramento(meta.id)}>Adicionar desdobramento</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
