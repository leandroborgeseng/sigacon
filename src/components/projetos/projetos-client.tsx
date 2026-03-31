"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusProjeto } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { GestaoSwitcher } from "@/components/gestao/gestao-switcher";

const statusOptions = [
  { value: StatusProjeto.NAO_INICIADO, label: "Não iniciado" },
  { value: StatusProjeto.EM_ANDAMENTO, label: "Em andamento" },
  { value: StatusProjeto.CONCLUIDO, label: "Concluído" },
  { value: StatusProjeto.BLOQUEADO, label: "Bloqueado" },
] as const;

type ChamadoLite = {
  id: string;
  glpiTicketId: number;
  titulo: string;
  statusLabel?: string | null;
};
type GlpiUserLite = { id: number; name: string };

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusProjeto;
  responsavel: string | null;
  responsavelGlpiId?: number | null;
  responsavelGlpiNome?: string | null;
  prazo: string | null;
  glpiChamadoId: string | null;
  glpiChamado?: { id: string; glpiTicketId: number; titulo: string } | null;
};

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  status: StatusProjeto;
  inicioPrevisto: string | null;
  fimPrevisto: string | null;
  tarefas: Tarefa[];
};

type NovoProjetoDraft = {
  nome: string;
  descricao: string;
  status: StatusProjeto;
  inicioPrevisto: string;
  fimPrevisto: string;
};

type NovaTarefaDraft = {
  titulo: string;
  responsavelGlpiId: number | null;
  responsavelGlpiNome: string;
  prazo: string;
  status: StatusProjeto;
  glpiChamadoId: string;
};

function dateToInput(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjetosClient({
  projetosIniciais,
  podeEditar,
}: {
  projetosIniciais: Projeto[];
  podeEditar: boolean;
}) {
  const [projetos, setProjetos] = useState<Projeto[]>(projetosIniciais);
  const [salvando, setSalvando] = useState(false);
  const [novoProjeto, setNovoProjeto] = useState<NovoProjetoDraft>({
    nome: "",
    descricao: "",
    status: StatusProjeto.NAO_INICIADO,
    inicioPrevisto: "",
    fimPrevisto: "",
  });
  const [novaTarefa, setNovaTarefa] = useState<Record<string, NovaTarefaDraft>>({});
  const [buscaChamado, setBuscaChamado] = useState<Record<string, string>>({});
  const [chamadosResultados, setChamadosResultados] = useState<Record<string, ChamadoLite[]>>({});
  const [chamadosNextCursor, setChamadosNextCursor] = useState<Record<string, string | null>>({});
  const [chamadosLoading, setChamadosLoading] = useState<Record<string, boolean>>({});
  const [somenteChamadosAbertos, setSomenteChamadosAbertos] = useState<Record<string, boolean>>({});
  const [buscaUsuario, setBuscaUsuario] = useState<Record<string, string>>({});
  const [usuariosResultados, setUsuariosResultados] = useState<Record<string, GlpiUserLite[]>>({});
  const [usuariosNextCursor, setUsuariosNextCursor] = useState<Record<string, string | null>>({});
  const [usuariosLoading, setUsuariosLoading] = useState<Record<string, boolean>>({});
  const [modoVisao, setModoVisao] = useState<"TABELA" | "KANBAN">("TABELA");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusProjeto>("TODOS");
  const [filtroResponsavel, setFiltroResponsavel] = useState("TODOS");
  const [filtroGlpi, setFiltroGlpi] = useState<"TODOS" | "VINCULADAS" | "NAO_VINCULADAS">("TODOS");

  const statusLabel = useMemo(
    () => Object.fromEntries(statusOptions.map((s) => [s.value, s.label])) as Record<StatusProjeto, string>,
    []
  );

  useEffect(() => {
    const timers: number[] = [];
    for (const [projetoId, texto] of Object.entries(buscaChamado)) {
      const q = texto.trim();
      if (q.length < 2) {
        setChamadosResultados((prev) => ({ ...prev, [projetoId]: [] }));
        continue;
      }
      const t = window.setTimeout(async () => {
        setChamadosLoading((prev) => ({ ...prev, [projetoId]: true }));
        try {
          const somenteAbertos = somenteChamadosAbertos[projetoId] !== false;
          const r = await fetch(`/api/integracao/glpi/chamados/search?q=${encodeURIComponent(q)}&somenteAbertos=${somenteAbertos ? "1" : "0"}&limit=20`);
          if (!r.ok) return;
          const data = (await r.json()) as { items?: ChamadoLite[]; nextCursor?: string | null };
          setChamadosResultados((prev) => ({ ...prev, [projetoId]: data.items ?? [] }));
          setChamadosNextCursor((prev) => ({ ...prev, [projetoId]: data.nextCursor ?? null }));
        } finally {
          setChamadosLoading((prev) => ({ ...prev, [projetoId]: false }));
        }
      }, 300);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [buscaChamado, somenteChamadosAbertos]);

  useEffect(() => {
    const timers: number[] = [];
    for (const [projetoId, texto] of Object.entries(buscaUsuario)) {
      const q = texto.trim();
      if (q.length < 2) {
        setUsuariosResultados((prev) => ({ ...prev, [projetoId]: [] }));
        continue;
      }
      const t = window.setTimeout(async () => {
        setUsuariosLoading((prev) => ({ ...prev, [projetoId]: true }));
        try {
          const r = await fetch(`/api/integracao/glpi/usuarios/search?q=${encodeURIComponent(q)}&limit=20`);
          if (!r.ok) return;
          const data = (await r.json()) as { items?: GlpiUserLite[]; nextCursor?: string | null };
          setUsuariosResultados((prev) => ({ ...prev, [projetoId]: data.items ?? [] }));
          setUsuariosNextCursor((prev) => ({ ...prev, [projetoId]: data.nextCursor ?? null }));
        } finally {
          setUsuariosLoading((prev) => ({ ...prev, [projetoId]: false }));
        }
      }, 300);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [buscaUsuario]);

  const responsaveisOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of projetos) {
      for (const t of p.tarefas) {
        const r = (t.responsavelGlpiNome || t.responsavel || "").trim();
        if (r) s.add(r);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [projetos]);

  const indicadoresVinculo = useMemo(() => {
    const tarefas = projetos.flatMap((p) => p.tarefas);
    const vinculadas = tarefas.filter((t) => Boolean(t.glpiChamadoId)).length;
    const naoVinculadas = tarefas.length - vinculadas;
    return { total: tarefas.length, vinculadas, naoVinculadas };
  }, [projetos]);

  const projetosFiltrados = useMemo(() => {
    const filtrar = (t: Tarefa) => {
      const okStatus = filtroStatus === "TODOS" || t.status === filtroStatus;
      const resp = (t.responsavelGlpiNome || t.responsavel || "").trim();
      const okResp = filtroResponsavel === "TODOS" || resp === filtroResponsavel;
      const okGlpi =
        filtroGlpi === "TODOS" ||
        (filtroGlpi === "VINCULADAS" ? Boolean(t.glpiChamadoId) : !t.glpiChamadoId);
      return okStatus && okResp && okGlpi;
    };
    return projetos.map((p) => ({ ...p, tarefas: p.tarefas.filter(filtrar) }));
  }, [projetos, filtroStatus, filtroResponsavel, filtroGlpi]);

  const kanban = useMemo(() => {
    const out: Record<StatusProjeto, Array<{ projetoNome: string; tarefa: Tarefa }>> = {
      [StatusProjeto.NAO_INICIADO]: [],
      [StatusProjeto.EM_ANDAMENTO]: [],
      [StatusProjeto.CONCLUIDO]: [],
      [StatusProjeto.BLOQUEADO]: [],
    };
    for (const p of projetosFiltrados) {
      for (const t of p.tarefas) out[t.status].push({ projetoNome: p.nome, tarefa: t });
    }
    return out;
  }, [projetosFiltrados]);

  const carregar = useCallback(async () => {
    const resp = await fetch("/api/projetos", { cache: "no-store" });
    if (!resp.ok) return;
    setProjetos(await resp.json());
  }, []);

  async function criarProjeto() {
    if (!podeEditar || !novoProjeto.nome.trim()) return;
    setSalvando(true);
    try {
      const resp = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...novoProjeto,
          inicioPrevisto: novoProjeto.inicioPrevisto || null,
          fimPrevisto: novoProjeto.fimPrevisto || null,
        }),
      });
      if (!resp.ok) return;
      setNovoProjeto({ nome: "", descricao: "", status: StatusProjeto.NAO_INICIADO, inicioPrevisto: "", fimPrevisto: "" });
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarProjeto(id: string, patch: Partial<Projeto>) {
    if (!podeEditar) return;
    const resp = await fetch(`/api/projetos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (resp.ok) await carregar();
  }

  async function excluirProjeto(id: string) {
    if (!podeEditar) return;
    if (!confirm("Excluir este projeto e todas as tarefas?")) return;
    const resp = await fetch(`/api/projetos/${id}`, { method: "DELETE" });
    if (resp.ok) await carregar();
  }

  async function criarTarefa(projetoId: string) {
    if (!podeEditar) return;
    const draft = novaTarefa[projetoId];
    if (!draft?.titulo?.trim() || !draft.responsavelGlpiId || !draft.responsavelGlpiNome) return;

    const resp = await fetch("/api/projetos/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projetoId,
        titulo: draft.titulo,
        responsavelGlpiId: draft.responsavelGlpiId,
        responsavelGlpiNome: draft.responsavelGlpiNome,
        responsavel: null,
        prazo: draft.prazo || null,
        status: draft.status,
        glpiChamadoId: draft.glpiChamadoId || null,
      }),
    });
    if (!resp.ok) return;

    setNovaTarefa((prev) => ({
      ...prev,
      [projetoId]: {
        titulo: "",
        responsavelGlpiId: null,
        responsavelGlpiNome: "",
        prazo: "",
        status: StatusProjeto.NAO_INICIADO,
        glpiChamadoId: "",
      },
    }));
    setBuscaUsuario((prev) => ({ ...prev, [projetoId]: "" }));
    setBuscaChamado((prev) => ({ ...prev, [projetoId]: "" }));
    await carregar();
  }

  async function atualizarTarefa(id: string, patch: Partial<Tarefa>) {
    if (!podeEditar) return;
    const resp = await fetch(`/api/projetos/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (resp.ok) await carregar();
  }

  async function excluirTarefa(id: string) {
    if (!podeEditar) return;
    const resp = await fetch(`/api/projetos/tarefas/${id}`, { method: "DELETE" });
    if (resp.ok) await carregar();
  }

  async function carregarMaisChamados(projetoId: string) {
    const cursor = chamadosNextCursor[projetoId];
    if (!cursor) return;
    const q = (buscaChamado[projetoId] ?? "").trim();
    if (q.length < 2) return;
    setChamadosLoading((prev) => ({ ...prev, [projetoId]: true }));
    const somenteAbertos = somenteChamadosAbertos[projetoId] !== false;
    try {
      const r = await fetch(
        `/api/integracao/glpi/chamados/search?q=${encodeURIComponent(q)}&somenteAbertos=${somenteAbertos ? "1" : "0"}&limit=20&cursor=${encodeURIComponent(cursor)}`
      );
      if (!r.ok) return;
      const data = (await r.json()) as { items?: ChamadoLite[]; nextCursor?: string | null };
      setChamadosResultados((prev) => ({
        ...prev,
        [projetoId]: [...(prev[projetoId] ?? []), ...(data.items ?? [])],
      }));
      setChamadosNextCursor((prev) => ({ ...prev, [projetoId]: data.nextCursor ?? null }));
    } finally {
      setChamadosLoading((prev) => ({ ...prev, [projetoId]: false }));
    }
  }

  async function carregarMaisUsuarios(projetoId: string) {
    const cursor = usuariosNextCursor[projetoId];
    if (!cursor) return;
    const q = (buscaUsuario[projetoId] ?? "").trim();
    if (q.length < 2) return;
    setUsuariosLoading((prev) => ({ ...prev, [projetoId]: true }));
    try {
      const r = await fetch(
        `/api/integracao/glpi/usuarios/search?q=${encodeURIComponent(q)}&limit=20&cursor=${encodeURIComponent(cursor)}`
      );
      if (!r.ok) return;
      const data = (await r.json()) as { items?: GlpiUserLite[]; nextCursor?: string | null };
      setUsuariosResultados((prev) => ({
        ...prev,
        [projetoId]: [...(prev[projetoId] ?? []), ...(data.items ?? [])],
      }));
      setUsuariosNextCursor((prev) => ({ ...prev, [projetoId]: data.nextCursor ?? null }));
    } finally {
      setUsuariosLoading((prev) => ({ ...prev, [projetoId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Projetos" }]} />
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gestão de projetos com tarefas vinculáveis ao GLPI.</p>
        </div>
        <GestaoSwitcher atual="projetos" />
      </div>

      <Card>
        <CardHeader><CardTitle>Indicadores de vínculo GLPI</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total de tarefas</p><p className="text-2xl font-bold">{indicadoresVinculo.total}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Vinculadas ao GLPI</p><p className="text-2xl font-bold">{indicadoresVinculo.vinculadas}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Não vinculadas</p><p className="text-2xl font-bold">{indicadoresVinculo.naoVinculadas}</p></CardContent></Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Filtros e visualização</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1"><Label>Status da tarefa</Label><Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as "TODOS" | StatusProjeto)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos</SelectItem>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Responsável</Label><Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos</SelectItem>{responsaveisOptions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Vínculo GLPI</Label><Select value={filtroGlpi} onValueChange={(v) => setFiltroGlpi(v as "TODOS" | "VINCULADAS" | "NAO_VINCULADAS")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todas</SelectItem><SelectItem value="VINCULADAS">Somente vinculadas</SelectItem><SelectItem value="NAO_VINCULADAS">Somente não vinculadas</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label>Visualização</Label><Select value={modoVisao} onValueChange={(v) => setModoVisao(v as "TABELA" | "KANBAN")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TABELA">Tabela por projeto</SelectItem><SelectItem value="KANBAN">Kanban de tarefas</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Novo projeto</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Nome</Label><Input value={novoProjeto.nome} onChange={(e) => setNovoProjeto((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Implantação de gestão de ativos" disabled={!podeEditar || salvando} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Descrição</Label><Textarea value={novoProjeto.descricao} onChange={(e) => setNovoProjeto((p) => ({ ...p, descricao: e.target.value }))} disabled={!podeEditar || salvando} /></div>
          <div className="space-y-2"><Label>Status</Label><Select value={novoProjeto.status} onValueChange={(v) => setNovoProjeto((p) => ({ ...p, status: v as StatusProjeto }))} disabled={!podeEditar || salvando}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Início previsto</Label><Input type="date" value={novoProjeto.inicioPrevisto} onChange={(e) => setNovoProjeto((p) => ({ ...p, inicioPrevisto: e.target.value }))} disabled={!podeEditar || salvando} /></div>
          <div className="space-y-2"><Label>Fim previsto</Label><Input type="date" value={novoProjeto.fimPrevisto} onChange={(e) => setNovoProjeto((p) => ({ ...p, fimPrevisto: e.target.value }))} disabled={!podeEditar || salvando} /></div>
          <div className="flex items-end"><Button onClick={criarProjeto} disabled={!podeEditar || salvando || !novoProjeto.nome.trim()}>Criar projeto</Button></div>
        </CardContent>
      </Card>

      {modoVisao === "KANBAN" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusOptions.map((coluna) => (
            <Card key={coluna.value}>
              <CardHeader><CardTitle className="text-base">{coluna.label} ({kanban[coluna.value].length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {kanban[coluna.value].length === 0 ? <p className="text-sm text-muted-foreground">Sem tarefas.</p> : kanban[coluna.value].map(({ projetoNome, tarefa }) => (
                  <div key={tarefa.id} className="rounded-md border p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Projeto: {projetoNome}</p>
                    <p className="font-medium leading-tight">{tarefa.titulo}</p>
                    <div className="flex flex-wrap gap-1">
                      {(tarefa.responsavelGlpiNome || tarefa.responsavel) ? <Badge variant="outline">{tarefa.responsavelGlpiNome || tarefa.responsavel}</Badge> : null}
                      <Badge variant={tarefa.glpiChamadoId ? "secondary" : "outline"}>Vinculado GLPI: {tarefa.glpiChamadoId ? "Sim" : "Não"}</Badge>
                    </div>
                    {tarefa.glpiChamado ? <p className="text-xs text-muted-foreground">#{tarefa.glpiChamado.glpiTicketId} - {tarefa.glpiChamado.titulo}</p> : null}
                    {podeEditar ? <div className="flex gap-2"><Select value={tarefa.status} onValueChange={(v) => atualizarTarefa(tarefa.id, { status: v as StatusProjeto })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select><Button size="sm" variant="ghost" onClick={() => excluirTarefa(tarefa.id)}>Remover</Button></div> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {modoVisao === "TABELA" ? projetosFiltrados.map((projeto) => {
        const draft = novaTarefa[projeto.id] ?? {
          titulo: "",
          responsavelGlpiId: null,
          responsavelGlpiNome: "",
          prazo: "",
          status: StatusProjeto.NAO_INICIADO,
          glpiChamadoId: "",
        };

        return (
          <Card key={projeto.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{projeto.nome}</CardTitle>
                {projeto.descricao ? <p className="text-sm text-muted-foreground mt-1">{projeto.descricao}</p> : null}
                <div className="flex gap-2 mt-2 items-center">
                  <Badge variant="secondary">{statusLabel[projeto.status]}</Badge>
                  {projeto.inicioPrevisto ? <Badge variant="outline">Início: {dateToInput(projeto.inicioPrevisto)}</Badge> : null}
                  {projeto.fimPrevisto ? <Badge variant="outline">Fim: {dateToInput(projeto.fimPrevisto)}</Badge> : null}
                </div>
              </div>
              {podeEditar ? <div className="flex gap-2"><Select value={projeto.status} onValueChange={(v) => atualizarProjeto(projeto.id, { status: v as StatusProjeto })}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select><Button variant="destructive" onClick={() => excluirProjeto(projeto.id)}>Excluir</Button></div> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Responsável</TableHead><TableHead>Prazo</TableHead><TableHead>Status</TableHead><TableHead>Chamado GLPI</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {projeto.tarefas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma tarefa cadastrada.</TableCell></TableRow> : projeto.tarefas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.titulo}</TableCell>
                      <TableCell>{t.responsavelGlpiNome || t.responsavel || "-"}</TableCell>
                      <TableCell>{dateToInput(t.prazo) || "-"}</TableCell>
                      <TableCell><Select value={t.status} onValueChange={(v) => atualizarTarefa(t.id, { status: v as StatusProjeto })} disabled={!podeEditar}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select></TableCell>
                      <TableCell>{t.glpiChamado ? `#${t.glpiChamado.glpiTicketId} - ${t.glpiChamado.titulo}` : "Não vinculado"}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => excluirTarefa(t.id)} disabled={!podeEditar}>Remover</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {podeEditar ? (
                <div className="grid gap-2 md:grid-cols-6">
                  <Input className="md:col-span-2" placeholder="Título da tarefa" value={draft.titulo} onChange={(e) => setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, titulo: e.target.value } }))} />

                  <div className="space-y-1">
                    <Input placeholder="Buscar responsável GLPI" value={buscaUsuario[projeto.id] ?? ""} onChange={(e) => setBuscaUsuario((prev) => ({ ...prev, [projeto.id]: e.target.value }))} />
                    {(usuariosResultados[projeto.id]?.length ?? 0) > 0 ? (
                      <div className="max-h-28 overflow-auto rounded border p-1 text-xs">
                        {usuariosResultados[projeto.id].map((u) => (
                          <button key={u.id} type="button" className="block w-full rounded px-2 py-1 text-left hover:bg-accent" onClick={() => {
                            setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, responsavelGlpiId: u.id, responsavelGlpiNome: u.name } }));
                            setBuscaUsuario((prev) => ({ ...prev, [projeto.id]: u.name }));
                          }}>{u.name} (#{u.id})</button>
                        ))}
                      </div>
                    ) : null}
                    {usuariosNextCursor[projeto.id] ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={usuariosLoading[projeto.id]}
                        onClick={() => carregarMaisUsuarios(projeto.id)}
                      >
                        {usuariosLoading[projeto.id] ? "Carregando..." : "Carregar mais usuários"}
                      </Button>
                    ) : null}
                  </div>

                  <Input type="date" value={draft.prazo} onChange={(e) => setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, prazo: e.target.value } }))} />

                  <Select value={draft.status} onValueChange={(v) => setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, status: v as StatusProjeto } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent></Select>

                  <div className="space-y-1">
                    <Input placeholder="Buscar chamado GLPI (opcional)" value={buscaChamado[projeto.id] ?? ""} onChange={(e) => setBuscaChamado((prev) => ({ ...prev, [projeto.id]: e.target.value }))} />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={somenteChamadosAbertos[projeto.id] !== false}
                        onChange={(e) =>
                          setSomenteChamadosAbertos((prev) => ({
                            ...prev,
                            [projeto.id]: e.target.checked,
                          }))
                        }
                      />
                      Buscar somente chamados abertos
                    </label>
                    {(chamadosResultados[projeto.id]?.length ?? 0) > 0 ? (
                      <div className="max-h-28 overflow-auto rounded border p-1 text-xs">
                        <button type="button" className="block w-full rounded px-2 py-1 text-left hover:bg-accent" onClick={() => setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, glpiChamadoId: "" } }))}>Sem vínculo</button>
                        {chamadosResultados[projeto.id].map((c) => (
                          <button key={c.id} type="button" className="block w-full rounded px-2 py-1 text-left hover:bg-accent" onClick={() => {
                            setNovaTarefa((prev) => ({ ...prev, [projeto.id]: { ...draft, glpiChamadoId: c.id } }));
                            setBuscaChamado((prev) => ({ ...prev, [projeto.id]: `#${c.glpiTicketId} - ${c.titulo}` }));
                          }}>#{c.glpiTicketId} - {c.titulo}</button>
                        ))}
                      </div>
                    ) : null}
                    {chamadosNextCursor[projeto.id] ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={chamadosLoading[projeto.id]}
                        onClick={() => carregarMaisChamados(projeto.id)}
                      >
                        {chamadosLoading[projeto.id] ? "Carregando..." : "Carregar mais chamados"}
                      </Button>
                    ) : null}
                  </div>

                  <Button onClick={() => criarTarefa(projeto.id)} disabled={!draft.titulo.trim() || !draft.responsavelGlpiId}>Adicionar tarefa</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      }) : null}
    </div>
  );
}
