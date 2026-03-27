"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { GlpiKanbanColuna } from "@prisma/client";
import { ORDEM_COLUNAS, GLPI_KANBAN_LABELS } from "@/lib/glpi-kanban-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
type Option = { id: number; name: string };
type TicketDetails = {
  avisos?: string[];
  ticket: {
    id?: number;
    name?: string;
    content?: string;
    date?: string;
    date_mod?: string;
    status?: number;
    urgency?: number;
    priority?: number;
    _itilcategories_id?: string;
    _groups_id_assign?: string;
    _users_id_assign?: string;
  };
  followups: Array<{
    id?: number;
    content?: string;
    date?: string;
    _users_id?: string;
    is_private?: number | boolean;
  }>;
  tasks: Array<{
    id?: number;
    content?: string;
    date?: string;
    _users_id?: string;
    is_private?: number | boolean;
    state?: number | string;
  }>;
  solutions: Array<{
    id?: number;
    content?: string;
    date_creation?: string;
    _users_id?: string;
    status?: number | string;
  }>;
  documents: Array<{
    documentId: number;
    name: string;
    link?: string;
  }>;
  ticketRaw?: Record<string, unknown>;
  ticketProperties?: Array<{ key: string; rawKey: string; value: string }>;
};

function sanitizeHtml(input: string): string {
  if (!input) return "";
  let html = input;
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/\son\w+="[^"]*"/gi, "");
  html = html.replace(/\son\w+='[^']*'/gi, "");
  html = html.replace(/javascript:/gi, "");
  return html;
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!ref.current || focused.current) return;
    const next = value || "";
    if (ref.current.innerHTML !== next) ref.current.innerHTML = next;
  }, [value]);

  function cmd(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => cmd("bold")}>
          B
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 italic" onClick={() => cmd("italic")}>
          I
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 underline" onClick={() => cmd("underline")}>
          U
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => cmd("insertUnorderedList")}>
          Lista
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => cmd("insertOrderedList")}>
          1.
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="p-3 text-sm outline-none"
        style={{ minHeight }}
        data-placeholder={placeholder ?? ""}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          if (ref.current) onChange(ref.current.innerHTML);
        }}
        onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      />
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export function GlpiKanbanClient({ contratos }: { contratos: Contrato[] }) {
  const searchParams = useSearchParams();
  const contratoInicial = searchParams.get("contratoId")?.trim() ?? "";
  const [contratoId, setContratoId] = useState<string>(contratoInicial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [cards, setCards] = useState<Chamado[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [grupos, setGrupos] = useState<Option[]>([]);
  const [categorias, setCategorias] = useState<Option[]>([]);
  const [usuarios, setUsuarios] = useState<Option[]>([]);
  const [detalhesId, setDetalhesId] = useState<number | null>(null);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [detalhes, setDetalhes] = useState<TicketDetails | null>(null);
  const [comentario, setComentario] = useState("");
  const [comentarioPrivado, setComentarioPrivado] = useState(false);
  const [comentarioSaving, setComentarioSaving] = useState(false);
  const [tarefa, setTarefa] = useState("");
  const [tarefaPrivada, setTarefaPrivada] = useState(false);
  const [tarefaSaving, setTarefaSaving] = useState(false);
  const [solucao, setSolucao] = useState("");
  const [solucaoSaving, setSolucaoSaving] = useState(false);
  const [dropCol, setDropCol] = useState<GlpiKanbanColuna | null>(null);
  const [draggingTicketId, setDraggingTicketId] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [editTicketName, setEditTicketName] = useState("");
  const [editTicketContent, setEditTicketContent] = useState("");
  const [editTicketSaving, setEditTicketSaving] = useState(false);
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
      const body: { contratoId?: string } = {};
      if (contratoId) body.contratoId = contratoId;
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
        setMsg(j.message ?? "Falha ao atualizar chamado no sistema de chamados");
        return;
      }
      setCards((prev) => prev.map((x) => (x.glpiTicketId === c.glpiTicketId ? { ...x, ...j } : x)));
      setEditandoId(null);
      setMsg(`Chamado #${c.glpiTicketId} atualizado no sistema de chamados.`);
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    // Metadados para selects (se falhar, mantém inputs numéricos como fallback mental).
    void fetch("/api/integracao/glpi/grupos")
      .then((r) => r.json())
      .then((j) => setGrupos(Array.isArray(j.grupos) ? j.grupos : []))
      .catch(() => {});
    void fetch("/api/integracao/glpi/categorias")
      .then((r) => r.json())
      .then((j) => setCategorias(Array.isArray(j.categorias) ? j.categorias : []))
      .catch(() => {});
    void fetch("/api/integracao/glpi/usuarios")
      .then((r) => r.json())
      .then((j) => setUsuarios(Array.isArray(j.usuarios) ? j.usuarios : []))
      .catch(() => {});
  }, []);

  function ticketField(details: TicketDetails, ...keys: string[]): string | null {
    const raw = details.ticketRaw ?? {};
    for (const key of keys) {
      const fromTicket = (details.ticket as Record<string, unknown>)[key];
      if (typeof fromTicket === "string" && fromTicket.trim()) return fromTicket.trim();
      if (typeof fromTicket === "number" || typeof fromTicket === "boolean") return String(fromTicket);
      const fromRaw = raw[key];
      if (typeof fromRaw === "string" && fromRaw.trim()) return fromRaw.trim();
      if (typeof fromRaw === "number" || typeof fromRaw === "boolean") return String(fromRaw);
    }
    return null;
  }

  function formatDateTime(v: string | null): string {
    if (!v) return "-";
    const t = Date.parse(v);
    if (!Number.isFinite(t)) return v;
    return new Date(t).toLocaleString("pt-BR");
  }

  async function abrirDetalhes(ticketId: number) {
    setDetalhesId(ticketId);
    setDetalhesLoading(true);
    setDetalhes(null);
    setComentario("");
    setComentarioPrivado(false);
    setTarefa("");
    setTarefaPrivada(false);
    setSolucao("");
    try {
      const r = await fetch(`/api/integracao/glpi/chamados/${ticketId}`, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; avisos?: string[] } & Partial<TicketDetails>;
      if (!r.ok || j.ok === false) {
        setMsg(j.message ?? "Erro ao carregar detalhes do ticket.");
        return;
      }
      setDetalhes({
        avisos: Array.isArray(j.avisos) ? j.avisos : [],
        ticket: j.ticket ?? {},
        followups: Array.isArray(j.followups) ? j.followups : [],
        tasks: Array.isArray(j.tasks) ? j.tasks : [],
        solutions: Array.isArray(j.solutions) ? j.solutions : [],
        documents: Array.isArray(j.documents) ? j.documents : [],
        ticketRaw: (j.ticketRaw && typeof j.ticketRaw === "object") ? (j.ticketRaw as Record<string, unknown>) : undefined,
        ticketProperties: Array.isArray(j.ticketProperties) ? (j.ticketProperties as TicketDetails["ticketProperties"]) : undefined,
      });
      setEditTicketName(typeof j.ticket?.name === "string" ? j.ticket.name : "");
      setEditTicketContent(typeof j.ticket?.content === "string" ? String(j.ticket.content) : "");
    } finally {
      setDetalhesLoading(false);
    }
  }

  async function enviarComentario() {
    if (!detalhesId) return;
    const content = comentario.trim();
    if (!content) return;
    setComentarioSaving(true);
    setMsg("");
    try {
      const r = await fetch(`/api/integracao/glpi/chamados/${detalhesId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, privado: comentarioPrivado }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok || j.ok === false) {
        setMsg(j.message ?? "Falha ao enviar comentário.");
        return;
      }
      await abrirDetalhes(detalhesId);
    } finally {
      setComentarioSaving(false);
    }
  }

  async function enviarTarefa() {
    if (!detalhesId) return;
    const content = tarefa.trim();
    if (!content) return;
    setTarefaSaving(true);
    setMsg("");
    try {
      const r = await fetch(`/api/integracao/glpi/chamados/${detalhesId}/tarefas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, privado: tarefaPrivada }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok || j.ok === false) {
        setMsg(j.message ?? "Falha ao criar tarefa.");
        return;
      }
      await abrirDetalhes(detalhesId);
    } finally {
      setTarefaSaving(false);
    }
  }

  async function enviarSolucao() {
    if (!detalhesId) return;
    const content = solucao.trim();
    if (!content) return;
    setSolucaoSaving(true);
    setMsg("");
    try {
      const r = await fetch(`/api/integracao/glpi/chamados/${detalhesId}/solucoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok || j.ok === false) {
        setMsg(j.message ?? "Falha ao criar solução.");
        return;
      }
      await abrirDetalhes(detalhesId);
    } finally {
      setSolucaoSaving(false);
    }
  }

  async function salvarTicketBasico() {
    if (!detalhesId) return;
    setEditTicketSaving(true);
    setMsg("");
    try {
      const r = await fetch(`/api/integracao/glpi/chamados/${detalhesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTicketName, content: editTicketContent }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok || j.ok === false) {
        setMsg(j.message ?? "Falha ao atualizar ticket.");
        return;
      }
      await abrirDetalhes(detalhesId);
    } finally {
      setEditTicketSaving(false);
    }
  }

  function colunaClasses(col: GlpiKanbanColuna) {
    // Cores por fase do fluxo (visual, sem mudar lógica).
    switch (col) {
      case "BACKLOG":
        return { header: "border-l-4 border-l-slate-400 bg-slate-50/60 dark:bg-slate-950/20", title: "text-slate-700 dark:text-slate-200" };
      case "EM_ANDAMENTO":
        return { header: "border-l-4 border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20", title: "text-blue-800 dark:text-blue-200" };
      case "AGUARDANDO":
        return { header: "border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20", title: "text-amber-900 dark:text-amber-200" };
      case "RESOLVIDO":
        return { header: "border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20", title: "text-emerald-900 dark:text-emerald-200" };
      case "FECHADO":
        return { header: "border-l-4 border-l-zinc-500 bg-zinc-50/60 dark:bg-zinc-950/20", title: "text-zinc-800 dark:text-zinc-200" };
      default:
        return { header: "", title: "" };
    }
  }

  function cardClasses(col: GlpiKanbanColuna) {
    // Mesma paleta da coluna, aplicada no card para padrão visual.
    switch (col) {
      case "BACKLOG":
        return "border-l-4 border-l-slate-400 bg-slate-50/40 dark:bg-slate-950/10";
      case "EM_ANDAMENTO":
        return "border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/10";
      case "AGUARDANDO":
        return "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10";
      case "RESOLVIDO":
        return "border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10";
      case "FECHADO":
        return "border-l-4 border-l-zinc-500 bg-zinc-50/40 dark:bg-zinc-950/10";
      default:
        return "";
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
    <div className={cn("space-y-4", fullscreen && "fixed inset-0 z-50 bg-background p-4 overflow-auto")}>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-xs text-muted-foreground shrink-0">Contrato</span>
            <div className="w-[280px] shrink-0">
              <Select value={contratoId || "__todos__"} onValueChange={(v) => setContratoId(v === "__todos__" ? "" : v)}>
                <SelectTrigger className="h-8">
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
            <Button size="sm" onClick={sincronizar} disabled={loading} className="shrink-0">
              Buscar no sistema de chamados
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={async () => {
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                } else {
                  await document.documentElement.requestFullscreen();
                }
              }}
            >
              {fullscreen ? "Sair tela cheia" : "Tela cheia"}
            </Button>
            {msg && <span className="text-xs text-muted-foreground shrink-0">{msg}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {ORDEM_COLUNAS.map((col) => (
          <Card key={col} className="min-h-[300px]">
            <CardHeader className={cn("pb-2", colunaClasses(col).header)}>
              <CardTitle className={cn("text-sm", colunaClasses(col).title)}>
                {GLPI_KANBAN_LABELS[col]} ({porColuna.get(col)?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "space-y-2 transition-colors",
                dropCol === col && "ring-2 ring-primary rounded-md bg-primary/5"
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDragEnter={() => setDropCol(col)}
              onDragLeave={() => setDropCol((prev) => (prev === col ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDropCol(null);
                const raw = e.dataTransfer.getData("text/glpiTicketId");
                const id = raw ? parseInt(raw, 10) : NaN;
                const atual = cards.find((x) => x.glpiTicketId === id)?.colunaKanban;
                if (Number.isFinite(id) && atual && atual !== col) void mover(id, col);
              }}
            >
              {dropCol === col && (
                <div className="rounded border border-dashed border-primary px-2 py-1 text-[11px] text-primary">
                  Solte aqui para mover
                </div>
              )}
              {(porColuna.get(col) ?? []).map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded border p-2 space-y-2 cursor-grab active:cursor-grabbing transition-opacity",
                    draggingTicketId === c.glpiTicketId && "opacity-50",
                    cardClasses(c.colunaKanban)
                  )}
                  draggable
                  onDragStart={(e) => {
                    setDraggingTicketId(c.glpiTicketId);
                    e.dataTransfer.setData("text/glpiTicketId", String(c.glpiTicketId));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDraggingTicketId(null);
                    setDropCol(null);
                  }}
                >
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
                      <Select
                        value={edits[c.glpiTicketId]?.categoriaIdGlpi ?? ""}
                        onValueChange={(v) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              categoriaIdGlpi: v === "__none__" ? "" : v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem categoria</SelectItem>
                          {categorias.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name} (#{o.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={edits[c.glpiTicketId]?.grupoTecnicoIdGlpi ?? ""}
                        onValueChange={(v) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              grupoTecnicoIdGlpi: v === "__none__" ? "" : v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Grupo técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem grupo</SelectItem>
                          {grupos.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name} (#{o.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={edits[c.glpiTicketId]?.tecnicoResponsavelIdGlpi ?? ""}
                        onValueChange={(v) =>
                          setEdits((prev) => ({
                            ...prev,
                            [c.glpiTicketId]: {
                              ...(prev[c.glpiTicketId] ?? valorInicialParaEdicao(c)),
                              tecnicoResponsavelIdGlpi: v === "__none__" ? "" : v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs col-span-2">
                          <SelectValue placeholder="Técnico responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem técnico</SelectItem>
                          {usuarios.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name} (#{o.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="col-span-2 flex gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={savingId === c.glpiTicketId}
                          onClick={() => void salvarEdicao(c)}
                        >
                          {savingId === c.glpiTicketId ? "Salvando..." : "Salvar no sistema"}
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
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => abrirEdicao(c)}>
                        Editar dados do chamado
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={() => void abrirDetalhes(c.glpiTicketId)}
                      >
                        Detalhes &amp; comentários
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={detalhesId != null} onOpenChange={(open) => (!open ? setDetalhesId(null) : null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chamado #{detalhesId ?? ""}</DialogTitle>
            <DialogDescription>
              Visualize o conteúdo completo e o histórico de comentários (followups) e envie novos comentários.
            </DialogDescription>
          </DialogHeader>
          {detalhesLoading && <p className="text-sm text-muted-foreground">Carregando detalhes…</p>}
          {!detalhesLoading && detalhes && (
            <div className="space-y-4">
              {detalhes.avisos && detalhes.avisos.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Avisos de carregamento</p>
                  <ul className="mt-1 space-y-1">
                    {detalhes.avisos.map((a, i) => (
                      <li key={`${a}-${i}`} className="text-xs text-amber-700 dark:text-amber-300">
                        - {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium">{detalhes.ticket.name ?? "(sem título)"}</p>
                <p className="text-xs text-muted-foreground">
                  {detalhes.ticket._itilcategories_id ? `Categoria: ${detalhes.ticket._itilcategories_id}. ` : ""}
                  {detalhes.ticket._groups_id_assign ? `Grupo: ${detalhes.ticket._groups_id_assign}. ` : ""}
                  {detalhes.ticket._users_id_assign ? `Técnico: ${detalhes.ticket._users_id_assign}.` : ""}
                </p>
                {detalhes.ticket.content && (
                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(detalhes.ticket.content)) }}
                  />
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Resumo do chamado</p>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span>{ticketField(detalhes, "status") ?? "-"}</span>
                    <span className="text-muted-foreground">Prioridade</span>
                    <span>{ticketField(detalhes, "priority", "prioridade") ?? "-"}</span>
                    <span className="text-muted-foreground">Urgência</span>
                    <span>{ticketField(detalhes, "urgency", "urgencia") ?? "-"}</span>
                    <span className="text-muted-foreground">Categoria</span>
                    <span>{ticketField(detalhes, "_itilcategories_id", "itilcategories_id", "categoria_nome") ?? "-"}</span>
                    <span className="text-muted-foreground">Grupo técnico</span>
                    <span>{ticketField(detalhes, "_groups_id_assign", "groups_id_assign", "grupo_tecnico_nome") ?? "-"}</span>
                    <span className="text-muted-foreground">Técnico</span>
                    <span>{ticketField(detalhes, "_users_id_assign", "users_id_assign", "tecnico_responsavel_nome") ?? "-"}</span>
                  </div>
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Rastreabilidade</p>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-muted-foreground">ID do ticket</span>
                    <span>{ticketField(detalhes, "id") ?? "-"}</span>
                    <span className="text-muted-foreground">Abertura</span>
                    <span>{formatDateTime(ticketField(detalhes, "date", "data_abertura"))}</span>
                    <span className="text-muted-foreground">Última atualização</span>
                    <span>{formatDateTime(ticketField(detalhes, "date_mod", "data_modificacao"))}</span>
                    <span className="text-muted-foreground">Entidade</span>
                    <span>{ticketField(detalhes, "entities_id", "_entities_id") ?? "-"}</span>
                    <span className="text-muted-foreground">Solicitante</span>
                    <span>{ticketField(detalhes, "_users_id_requester", "users_id_recipient") ?? "-"}</span>
                    <span className="text-muted-foreground">Origem</span>
                    <span>{ticketField(detalhes, "requesttypes_id", "_requesttypes_id") ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Editar ticket (campos principais)</p>
                <Input value={editTicketName} onChange={(e) => setEditTicketName(e.target.value)} placeholder="Título" />
                <RichTextEditor
                  value={editTicketContent}
                  onChange={setEditTicketContent}
                  placeholder="Descrição / conteúdo"
                  minHeight={140}
                />
                <Button onClick={() => void salvarTicketBasico()} disabled={editTicketSaving}>
                  {editTicketSaving ? "Salvando…" : "Salvar ticket"}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Linha do tempo</p>
                <div className="rounded-md border p-3 space-y-3 max-h-[360px] overflow-auto">
                  {(() => {
                    const items: Array<{
                      kind: "comentario" | "tarefa" | "solucao" | "documento";
                      date: string;
                      title: string;
                      meta?: string;
                      content?: string;
                      link?: string;
                    }> = [];
                    for (const f of detalhes.followups) {
                      items.push({
                        kind: "comentario",
                        date: f.date ?? "",
                        title: "Comentário",
                        meta: `${f._users_id ?? ""}${f.is_private ? " • privado" : ""}`.trim() || undefined,
                        content: String(f.content ?? ""),
                      });
                    }
                    for (const t of detalhes.tasks) {
                      items.push({
                        kind: "tarefa",
                        date: t.date ?? "",
                        title: "Tarefa",
                        meta: `${t._users_id ?? ""}${t.is_private ? " • privada" : ""}${
                          t.state != null ? ` • estado ${t.state}` : ""
                        }`.trim() || undefined,
                        content: String(t.content ?? ""),
                      });
                    }
                    for (const s of detalhes.solutions) {
                      items.push({
                        kind: "solucao",
                        date: s.date_creation ?? "",
                        title: "Solução",
                        meta: `${s._users_id ?? ""}${s.status != null ? ` • status ${s.status}` : ""}`.trim() || undefined,
                        content: String(s.content ?? ""),
                      });
                    }
                    for (const d of detalhes.documents) {
                      items.push({
                        kind: "documento",
                        date: "",
                        title: "Documento",
                        meta: `#${d.documentId}`,
                        content: d.name,
                        link: d.link,
                      });
                    }
                    const score = (s: string) => {
                      const t = Date.parse(s);
                      return Number.isFinite(t) ? t : -1;
                    };
                    items.sort((a, b) => score(b.date) - score(a.date));
                    if (items.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nada encontrado ainda.</p>;
                    }
                    return items.map((it, idx) => (
                      <div key={`${it.kind}-${it.date}-${idx}`} className="border-b last:border-b-0 pb-3 last:pb-0">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{it.title}</span>
                          {it.date ? ` • ${new Date(it.date).toLocaleString("pt-BR")}` : ""}
                          {it.meta ? ` • ${it.meta}` : ""}
                          {it.link ? (
                            <>
                              {" "}
                              •{" "}
                              <a href={it.link} target="_blank" rel="noreferrer" className="underline">
                                abrir
                              </a>
                            </>
                          ) : null}
                        </p>
                        {it.content ? (
                          <div
                            className="text-sm prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(it.content) }}
                          />
                        ) : null}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Novo comentário</p>
                <RichTextEditor
                  value={comentario}
                  onChange={setComentario}
                  placeholder="Escreva um comentário para adicionar ao chamado…"
                  minHeight={130}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={comentarioPrivado}
                    onChange={(e) => setComentarioPrivado(e.target.checked)}
                  />
                  Marcar como privado (se permitido no sistema)
                </label>
                <div className="flex gap-2">
                  <Button onClick={() => void enviarComentario()} disabled={comentarioSaving || !comentario.trim()}>
                    {comentarioSaving ? "Enviando…" : "Enviar comentário"}
                  </Button>
                  <Button variant="secondary" onClick={() => detalhesId && abrirDetalhes(detalhesId)} disabled={detalhesLoading}>
                    Recarregar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Nova tarefa</p>
                <RichTextEditor
                  value={tarefa}
                  onChange={setTarefa}
                  placeholder="Descreva uma tarefa (ITILTask) para adicionar ao chamado…"
                  minHeight={120}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={tarefaPrivada}
                    onChange={(e) => setTarefaPrivada(e.target.checked)}
                  />
                  Marcar como privada (se permitido no sistema)
                </label>
                <Button onClick={() => void enviarTarefa()} disabled={tarefaSaving || !tarefa.trim()}>
                  {tarefaSaving ? "Enviando…" : "Criar tarefa"}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Nova solução</p>
                <RichTextEditor
                  value={solucao}
                  onChange={setSolucao}
                  placeholder="Descreva a solução (ITILSolution) para registrar no chamado…"
                  minHeight={120}
                />
                <Button onClick={() => void enviarSolucao()} disabled={solucaoSaving || !solucao.trim()}>
                  {solucaoSaving ? "Enviando…" : "Registrar solução"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
