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
import { FolderKanban, Plus } from "lucide-react";
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

const EMPTY_NOVA_TAREFA: NovaTarefaDraft = {
  titulo: "",
  responsavelGlpiId: null,
  responsavelGlpiNome: "",
  prazo: "",
  status: StatusProjeto.NAO_INICIADO,
  glpiChamadoId: "",
};

const NOVO_PROJETO_VAZIO: NovoProjetoDraft = {
  nome: "",
  descricao: "",
  status: StatusProjeto.NAO_INICIADO,
  inicioPrevisto: "",
  fimPrevisto: "",
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
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoProjetoModalAberto, setNovoProjetoModalAberto] = useState(false);
  const [novoProjeto, setNovoProjeto] = useState<NovoProjetoDraft>({ ...NOVO_PROJETO_VAZIO });
  const [novaTarefa, setNovaTarefa] = useState<Record<string, NovaTarefaDraft>>({});
  const patchNovaTarefa = useCallback((projetoId: string, partial: Partial<NovaTarefaDraft>) => {
    setNovaTarefa((prev) => {
      const cur = prev[projetoId] ?? { ...EMPTY_NOVA_TAREFA };
      return { ...prev, [projetoId]: { ...cur, ...partial } };
    });
  }, []);
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

  const indicadores = useMemo(() => {
    const tarefas = projetos.flatMap((p) => p.tarefas);
    return {
      totalProjetos: projetos.length,
      totalTarefas: tarefas.length,
      totalConcluidas: tarefas.filter((t) => t.status === StatusProjeto.CONCLUIDO).length,
      vinculadasGlpi: tarefas.filter((t) => Boolean(t.glpiChamadoId)).length,
    };
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

  const nenhumaTarefaComFiltros = useMemo(
    () => projetos.length > 0 && !projetosFiltrados.some((p) => p.tarefas.length > 0),
    [projetos, projetosFiltrados]
  );

  useEffect(() => {
    if (novoProjetoModalAberto) {
      setNovoProjeto({ ...NOVO_PROJETO_VAZIO });
    }
  }, [novoProjetoModalAberto]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await fetch("/api/projetos", { cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = (data as { message?: string }).message ?? "Erro ao carregar projetos";
        setErro(msg);
        toast({
          variant: "destructive",
          title: "Erro ao carregar projetos",
          description: msg,
        });
        return;
      }
      setProjetos(data as Projeto[]);
    } finally {
      setLoading(false);
    }
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
      if (!resp.ok) {
        const err = (await resp.json().catch(() => ({}))) as { message?: string };
        toast({
          variant: "destructive",
          title: "Não foi possível criar o projeto",
          description: err.message,
        });
        return;
      }
      setNovoProjeto({ ...NOVO_PROJETO_VAZIO });
      setNovoProjetoModalAberto(false);
      await carregar();
      toast({ variant: "success", title: "Projeto criado" });
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
    if (resp.ok) {
      await carregar();
      toast({ variant: "success", title: "Projeto atualizado" });
    } else {
      const err = (await resp.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: "Erro ao atualizar projeto", description: err.message });
    }
  }

  async function excluirProjeto(id: string) {
    if (!podeEditar) return;
    if (!confirm("Excluir este projeto e todas as tarefas?")) return;
    const resp = await fetch(`/api/projetos/${id}`, { method: "DELETE" });
    if (resp.ok) {
      await carregar();
      toast({ variant: "success", title: "Projeto excluído" });
    } else {
      const err = (await resp.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
    }
  }

  async function criarTarefa(projetoId: string) {
    if (!podeEditar) return;
    const draft = novaTarefa[projetoId] ?? { ...EMPTY_NOVA_TAREFA };
    const titulo = draft.titulo.trim();
    if (titulo.length < 3) {
      toast({
        variant: "destructive",
        title: "Título inválido",
        description: "Use pelo menos 3 caracteres no título da tarefa.",
      });
      return;
    }
    if (draft.responsavelGlpiId != null && !draft.responsavelGlpiNome?.trim()) {
      toast({
        variant: "destructive",
        title: "Responsável GLPI",
        description: "Escolha um usuário na lista de resultados abaixo da busca.",
      });
      return;
    }

    const resp = await fetch("/api/projetos/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projetoId,
        titulo,
        responsavelGlpiId: draft.responsavelGlpiId ?? null,
        responsavelGlpiNome: draft.responsavelGlpiNome?.trim() || null,
        responsavel: null,
        prazo: draft.prazo || null,
        status: draft.status,
        glpiChamadoId: draft.glpiChamadoId || null,
      }),
    });
    if (!resp.ok) {
      const err = (await resp.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: "Erro ao criar tarefa", description: err.message });
      return;
    }

    setNovaTarefa((prev) => ({
      ...prev,
      [projetoId]: { ...EMPTY_NOVA_TAREFA },
    }));
    setBuscaUsuario((prev) => ({ ...prev, [projetoId]: "" }));
    setBuscaChamado((prev) => ({ ...prev, [projetoId]: "" }));
    await carregar();
    toast({ variant: "success", title: "Tarefa adicionada" });
  }

  async function atualizarTarefa(id: string, patch: Partial<Tarefa>) {
    if (!podeEditar) return;
    const resp = await fetch(`/api/projetos/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (resp.ok) {
      await carregar();
      toast({ variant: "success", title: "Tarefa atualizada" });
    } else {
      const err = (await resp.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: "Erro ao atualizar tarefa", description: err.message });
    }
  }

  async function excluirTarefa(id: string) {
    if (!podeEditar) return;
    const resp = await fetch(`/api/projetos/tarefas/${id}`, { method: "DELETE" });
    if (resp.ok) {
      await carregar();
      toast({ variant: "success", title: "Tarefa removida" });
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
            <p className="text-muted-foreground">Gestão de projetos com tarefas vinculáveis ao GLPI.</p>
          </div>
          <GestaoSwitcher atual="projetos" />
        </div>
        {podeEditar ? (
          <Button type="button" className="shrink-0" onClick={() => setNovoProjetoModalAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo projeto
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Indicadores de todos os projetos carregados, independente dos filtros abaixo.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Projetos</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalProjetos}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalTarefas}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Tarefas concluídas</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.totalConcluidas}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Vinculadas ao GLPI</p>
                <p className="text-2xl font-bold tabular-nums">{indicadores.vinculadasGlpi}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atualização e filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <Button variant="outline" onClick={() => void carregar()} disabled={loading}>
              {loading ? "Atualizando…" : "Atualizar"}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Status da tarefa</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as "TODOS" | StatusProjeto)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
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
              <Label>Vínculo GLPI</Label>
              <Select value={filtroGlpi} onValueChange={(v) => setFiltroGlpi(v as "TODOS" | "VINCULADAS" | "NAO_VINCULADAS")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas</SelectItem>
                  <SelectItem value="VINCULADAS">Somente vinculadas</SelectItem>
                  <SelectItem value="NAO_VINCULADAS">Somente não vinculadas</SelectItem>
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
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </CardContent>
      </Card>

      {modoVisao === "KANBAN" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projetos — Kanban</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tarefas por status (respeitam os filtros de status, responsável e vínculo GLPI).
            </p>
          </CardHeader>
          <CardContent>
            {projetos.length === 0 && !loading ? (
              <div className="rounded-lg border border-dashed bg-muted/15 py-10 text-center text-sm text-muted-foreground">
                Nenhum projeto cadastrado. Use <span className="font-medium text-foreground">Novo projeto</span> no topo da página.
              </div>
            ) : null}
            {projetos.length > 0 && nenhumaTarefaComFiltros ? (
              <div className="mb-4 rounded-lg border border-dashed bg-muted/15 py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa com os filtros atuais. Ajuste status, responsável ou vínculo GLPI.
              </div>
            ) : null}
            {projetos.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {statusOptions.map((coluna) => (
                <Card key={coluna.value}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {coluna.label} ({kanban[coluna.value].length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[min(60vh,480px)] space-y-2 overflow-y-auto">
                    {kanban[coluna.value].length === 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/15 py-8 text-center text-xs text-muted-foreground">
                        Nenhuma tarefa neste status com os filtros atuais.
                      </div>
                    ) : (
                      kanban[coluna.value].map(({ projetoNome, tarefa }) => (
                        <div
                          key={tarefa.id}
                          className="space-y-2 rounded-md border border-l-4 border-l-primary/40 bg-card p-2.5 shadow-sm"
                        >
                          <p className="text-[11px] font-medium text-muted-foreground">Projeto: {projetoNome}</p>
                          <p className="text-sm font-medium leading-tight">{tarefa.titulo}</p>
                          <div className="flex flex-wrap gap-1">
                            {tarefa.responsavelGlpiNome || tarefa.responsavel ? (
                              <Badge variant="outline">{tarefa.responsavelGlpiNome || tarefa.responsavel}</Badge>
                            ) : null}
                            <Badge variant={tarefa.glpiChamadoId ? "secondary" : "outline"}>
                              GLPI: {tarefa.glpiChamadoId ? "Sim" : "Não"}
                            </Badge>
                          </div>
                          {tarefa.glpiChamado ? (
                            <p className="text-xs text-muted-foreground">
                              #{tarefa.glpiChamado.glpiTicketId} — {tarefa.glpiChamado.titulo}
                            </p>
                          ) : null}
                          {podeEditar ? (
                            <div className="flex flex-wrap gap-2">
                              <Select
                                value={tarefa.status}
                                onValueChange={(v) => atualizarTarefa(tarefa.id, { status: v as StatusProjeto })}
                              >
                                <SelectTrigger className="h-8 w-full min-w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" onClick={() => excluirTarefa(tarefa.id)}>
                                Remover
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {modoVisao === "TABELA" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada bloco é um projeto; as tarefas listadas respeitam os filtros acima.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && projetos.length === 0 ? <ListLoadingSkeleton linhas={8} /> : null}
            {!loading && projetos.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Nenhum projeto cadastrado"
                description="Use o botão Novo projeto no topo da página para criar o primeiro. As tarefas podem ter responsáveis do GLPI e vínculo opcional com chamados."
              />
            ) : null}
            {projetosFiltrados.map((projeto) => {
              const draft = novaTarefa[projeto.id] ?? { ...EMPTY_NOVA_TAREFA };
              const tituloTarefaOk = draft.titulo.trim().length >= 3;
              const tarefasTotaisNoProjeto = projetos.find((p) => p.id === projeto.id)?.tarefas.length ?? 0;
              const mensagemTabelaVazia =
                projeto.tarefas.length === 0
                  ? tarefasTotaisNoProjeto > 0
                    ? "Nenhuma tarefa deste projeto com os filtros atuais."
                    : "Nenhuma tarefa cadastrada."
                  : null;

              return (
                <Card key={projeto.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>{projeto.nome}</CardTitle>
                      {projeto.descricao ? <p className="text-sm text-muted-foreground mt-1">{projeto.descricao}</p> : null}
                      <div className="flex gap-2 mt-2 items-center flex-wrap">
                        <Badge variant="secondary">{statusLabel[projeto.status]}</Badge>
                        {projeto.inicioPrevisto ? (
                          <Badge variant="outline">Início: {dateToInput(projeto.inicioPrevisto)}</Badge>
                        ) : null}
                        {projeto.fimPrevisto ? (
                          <Badge variant="outline">Fim: {dateToInput(projeto.fimPrevisto)}</Badge>
                        ) : null}
                      </div>
                    </div>
                    {podeEditar ? (
                      <div className="flex gap-2 shrink-0">
                        <Select value={projeto.status} onValueChange={(v) => atualizarProjeto(projeto.id, { status: v as StatusProjeto })}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="destructive" onClick={() => excluirProjeto(projeto.id)}>
                          Excluir
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Table stickyHeader scrollMaxHeight="min(55vh, 28rem)">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarefa</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Chamado GLPI</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mensagemTabelaVazia ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              {mensagemTabelaVazia}
                            </TableCell>
                          </TableRow>
                        ) : (
                          projeto.tarefas.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">{t.titulo}</TableCell>
                              <TableCell>{t.responsavelGlpiNome || t.responsavel || "-"}</TableCell>
                              <TableCell>{dateToInput(t.prazo) || "-"}</TableCell>
                              <TableCell>
                                <Select
                                  value={t.status}
                                  onValueChange={(v) => atualizarTarefa(t.id, { status: v as StatusProjeto })}
                                  disabled={!podeEditar}
                                >
                                  <SelectTrigger className="w-[160px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {t.glpiChamado ? `#${t.glpiChamado.glpiTicketId} - ${t.glpiChamado.titulo}` : "Não vinculado"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => excluirTarefa(t.id)} disabled={!podeEditar}>
                                  Remover
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {podeEditar ? (
                      <div className="grid gap-2 md:grid-cols-6">
                        <Input
                          className="md:col-span-2"
                          placeholder="Título da tarefa (mín. 3 caracteres)"
                          value={draft.titulo}
                          onChange={(e) => patchNovaTarefa(projeto.id, { titulo: e.target.value })}
                        />

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Responsável GLPI (opcional)</Label>
                          <Input
                            placeholder="Digite para buscar e clique no nome"
                            value={buscaUsuario[projeto.id] ?? ""}
                            onChange={(e) => setBuscaUsuario((prev) => ({ ...prev, [projeto.id]: e.target.value }))}
                          />
                          {draft.responsavelGlpiId != null ? (
                            <p className="text-xs text-muted-foreground">
                              Selecionado: <span className="font-medium text-foreground">{draft.responsavelGlpiNome}</span> (#
                              {draft.responsavelGlpiId})
                              <button
                                type="button"
                                className="ml-2 text-primary underline"
                                onClick={() => {
                                  patchNovaTarefa(projeto.id, { responsavelGlpiId: null, responsavelGlpiNome: "" });
                                  setBuscaUsuario((prev) => ({ ...prev, [projeto.id]: "" }));
                                }}
                              >
                                Limpar
                              </button>
                            </p>
                          ) : null}
                          {(usuariosResultados[projeto.id]?.length ?? 0) > 0 ? (
                            <div className="max-h-28 overflow-auto rounded border p-1 text-xs">
                              {usuariosResultados[projeto.id].map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  className="block w-full rounded px-2 py-1 text-left hover:bg-accent"
                                  onClick={() => {
                                    patchNovaTarefa(projeto.id, { responsavelGlpiId: u.id, responsavelGlpiNome: u.name });
                                    setBuscaUsuario((prev) => ({ ...prev, [projeto.id]: u.name }));
                                  }}
                                >
                                  {u.name} (#{u.id})
                                </button>
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

                        <Input
                          type="date"
                          value={draft.prazo}
                          onChange={(e) => patchNovaTarefa(projeto.id, { prazo: e.target.value })}
                        />

                        <Select
                          value={draft.status}
                          onValueChange={(v) => patchNovaTarefa(projeto.id, { status: v as StatusProjeto })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="space-y-1">
                          <Input
                            placeholder="Buscar chamado GLPI (opcional)"
                            value={buscaChamado[projeto.id] ?? ""}
                            onChange={(e) => setBuscaChamado((prev) => ({ ...prev, [projeto.id]: e.target.value }))}
                          />
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
                              <button
                                type="button"
                                className="block w-full rounded px-2 py-1 text-left hover:bg-accent"
                                onClick={() => patchNovaTarefa(projeto.id, { glpiChamadoId: "" })}
                              >
                                Sem vínculo
                              </button>
                              {chamadosResultados[projeto.id].map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="block w-full rounded px-2 py-1 text-left hover:bg-accent"
                                  onClick={() => {
                                    patchNovaTarefa(projeto.id, { glpiChamadoId: c.id });
                                    setBuscaChamado((prev) => ({ ...prev, [projeto.id]: `#${c.glpiTicketId} - ${c.titulo}` }));
                                  }}
                                >
                                  #{c.glpiTicketId} - {c.titulo}
                                </button>
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

                        <Button
                          type="button"
                          onClick={() => criarTarefa(projeto.id)}
                          disabled={!tituloTarefaOk}
                          title={
                            !tituloTarefaOk
                              ? "Informe um título com pelo menos 3 caracteres (responsável GLPI é opcional)"
                              : undefined
                          }
                        >
                          Adicionar tarefa
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={novoProjetoModalAberto} onOpenChange={setNovoProjetoModalAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showClose>
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
            <DialogDescription className="sr-only">
              Preencha nome, descrição, status e prazos. Depois de criar, adicione tarefas em cada projeto na visualização em tabela.
            </DialogDescription>
          </DialogHeader>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              void criarProjeto();
            }}
          >
            <div className="grid gap-3 py-1">
              <div className="space-y-1">
                <Label htmlFor="novo-proj-nome">Nome</Label>
                <Input
                  id="novo-proj-nome"
                  value={novoProjeto.nome}
                  onChange={(e) => setNovoProjeto((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex.: Implantação de gestão de ativos"
                  disabled={salvando}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="novo-proj-desc">Descrição (opcional)</Label>
                <Textarea
                  id="novo-proj-desc"
                  value={novoProjeto.descricao}
                  onChange={(e) => setNovoProjeto((p) => ({ ...p, descricao: e.target.value }))}
                  disabled={salvando}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={novoProjeto.status}
                  onValueChange={(v) => setNovoProjeto((p) => ({ ...p, status: v as StatusProjeto }))}
                  disabled={salvando}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="novo-proj-ini">Início previsto</Label>
                  <Input
                    id="novo-proj-ini"
                    type="date"
                    value={novoProjeto.inicioPrevisto}
                    onChange={(e) => setNovoProjeto((p) => ({ ...p, inicioPrevisto: e.target.value }))}
                    disabled={salvando}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="novo-proj-fim">Fim previsto</Label>
                  <Input
                    id="novo-proj-fim"
                    type="date"
                    value={novoProjeto.fimPrevisto}
                    onChange={(e) => setNovoProjeto((p) => ({ ...p, fimPrevisto: e.target.value }))}
                    disabled={salvando}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setNovoProjetoModalAberto(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando || !novoProjeto.nome.trim()}>
                Criar projeto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
