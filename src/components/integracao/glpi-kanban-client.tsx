"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusProjeto, type GlpiKanbanColuna } from "@prisma/client";
import { ORDEM_COLUNAS, GLPI_KANBAN_LABELS } from "@/lib/glpi-kanban-map";
import type { GlpiTicketPayload } from "@/lib/glpi-client";
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
import { toast } from "@/hooks/use-toast";

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
  desdobramentosMeta?: Array<{
    id: string;
    desdobramento: { id: string; titulo: string; meta: { id: string; titulo: string } };
  }>;
};
type TarefaProjetoCard = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusProjeto;
  responsavel: string | null;
  responsavelGlpiId?: number | null;
  responsavelGlpiNome?: string | null;
  prazo: string | null;
  glpiChamadoId: string | null;
  glpiChamado: { id: string; glpiTicketId: number; titulo: string } | null;
  projeto: { id: string; nome: string };
  colunaKanban: GlpiKanbanColuna;
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
    itilcategories_id?: number | string;
    groups_id_assign?: number | string;
    users_id_assign?: number | string;
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
};

/** Resposta do GET `/api/integracao/glpi/chamados/[ticketId]` — ticket alinhado ao payload GLPI. */
type GlpiChamadoDetalheResponse = {
  ok?: boolean;
  message?: string;
  avisos?: string[];
  ticket?: GlpiTicketPayload;
  followups?: TicketDetails["followups"];
  tasks?: TicketDetails["tasks"];
  solutions?: TicketDetails["solutions"];
  documents?: TicketDetails["documents"];
  ticketRaw?: Record<string, unknown>;
};

function glpiCampoIdParaFormulario(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return v.trim();
  return "";
}

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
  const standalone = searchParams.get("standalone") === "1";
  const contratoIdFromUrl = searchParams.get("contratoId")?.trim() ?? "";
  const [contratoId, setContratoId] = useState<string>(contratoIdFromUrl);
  const [contexto, setContexto] = useState<"contratos" | "metas" | "projetos">("contratos");
  const [metaIdSelecionada, setMetaIdSelecionada] = useState<string>("__todas__");
  const [projetoIdSelecionado, setProjetoIdSelecionado] = useState<string>("__todos__");
  const [mostrarVinculo, setMostrarVinculo] = useState<"todos" | "com" | "sem">("todos");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [cards, setCards] = useState<Chamado[]>([]);
  const [tarefasProjetoCards, setTarefasProjetoCards] = useState<TarefaProjetoCard[]>([]);
  const [metasFiltro, setMetasFiltro] = useState<Array<{ id: string; titulo: string }>>([]);
  const [projetosFiltro, setProjetosFiltro] = useState<Array<{ id: string; nome: string }>>([]);
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
  const [editTicketName, setEditTicketName] = useState("");
  const [editTicketContent, setEditTicketContent] = useState("");
  const [editPrioridade, setEditPrioridade] = useState("");
  const [editUrgencia, setEditUrgencia] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editGrupoId, setEditGrupoId] = useState("");
  const [editTecnicoId, setEditTecnicoId] = useState("");
  const [editTicketSaving, setEditTicketSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      qs.set("contexto", contexto);
      qs.set("vinculo", mostrarVinculo);
      if (contexto === "contratos" && contratoId) qs.set("contratoId", contratoId);
      if (contexto === "metas" && metaIdSelecionada !== "__todas__") qs.set("metaId", metaIdSelecionada);
      if (contexto === "projetos" && projetoIdSelecionado !== "__todos__") qs.set("projetoId", projetoIdSelecionado);
      const r = await fetch(`/api/integracao/glpi/chamados?${qs.toString()}`);
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.message ?? "Erro ao carregar chamados");
        return;
      }
      const chamados = (j?.chamados ?? []) as Chamado[];
      const tarefasProjeto = (j?.tarefasProjeto ?? []) as TarefaProjetoCard[];
      setMetasFiltro((j?.metasDisponiveis ?? []) as Array<{ id: string; titulo: string }>);
      setProjetosFiltro((j?.projetosDisponiveis ?? []) as Array<{ id: string; nome: string }>);
      setCards(chamados);
      setTarefasProjetoCards(tarefasProjeto);
      setMsg(`${chamados.length} chamado(s) e ${tarefasProjeto.length} tarefa(s) carregado(s).`);
    } finally {
      setLoading(false);
    }
  }, [contexto, contratoId, metaIdSelecionada, projetoIdSelecionado, mostrarVinculo]);

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
        const err = j.message ?? "Erro ao sincronizar";
        setMsg(err);
        toast({ variant: "destructive", title: "Sincronização falhou", description: err });
        return;
      }
      const okMsg = `Sincronização concluída: ${j.processados} ticket(s).`;
      setMsg(okMsg);
      toast({ variant: "success", title: "Sincronização concluída", description: `${j.processados} ticket(s) processado(s).` });
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
      const err = (j as { message?: string }).message ?? "Falha ao mover chamado";
      setMsg(err);
      toast({ variant: "destructive", title: "Não foi possível mover o chamado", description: err });
      return;
    }
    toast({
      variant: "success",
      title: "Chamado atualizado",
      description: `#${glpiTicketId} → ${GLPI_KANBAN_LABELS[colunaKanban]}`,
    });
  }

  useEffect(() => {
    setContratoId(contratoIdFromUrl);
  }, [contratoIdFromUrl]);

  useEffect(() => {
    void carregar();
  }, [carregar]);


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

  function actorLabel(v: unknown): string | null {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const nome =
      (typeof o._users_id === "string" && o._users_id.trim()) ||
      (typeof o._users_id_editor === "string" && o._users_id_editor.trim()) ||
      (typeof o._users_id_recipient === "string" && o._users_id_recipient.trim()) ||
      "";
    if (nome) return nome;
    const id =
      (typeof o.users_id === "number" || typeof o.users_id === "string" ? String(o.users_id) : "") ||
      (typeof o.users_id_editor === "number" || typeof o.users_id_editor === "string"
        ? String(o.users_id_editor)
        : "") ||
      (typeof o.users_id_recipient === "number" || typeof o.users_id_recipient === "string"
        ? String(o.users_id_recipient)
        : "");
    return id ? `Usuário #${id}` : null;
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
      const j = (await r.json().catch(() => ({}))) as GlpiChamadoDetalheResponse;
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
      });
      setEditTicketName(typeof j.ticket?.name === "string" ? j.ticket.name : "");
      setEditTicketContent(typeof j.ticket?.content === "string" ? String(j.ticket.content) : "");
      const card = cards.find((x) => x.glpiTicketId === ticketId);
      setEditPrioridade(
        card?.prioridade != null
          ? String(card.prioridade)
          : typeof j.ticket?.priority === "number"
            ? String(j.ticket.priority)
            : ""
      );
      setEditUrgencia(
        card?.urgencia != null
          ? String(card.urgencia)
          : typeof j.ticket?.urgency === "number"
            ? String(j.ticket.urgency)
            : ""
      );
      setEditCategoriaId(
        card?.categoriaIdGlpi != null ? String(card.categoriaIdGlpi) : glpiCampoIdParaFormulario(j.ticket?.itilcategories_id)
      );
      setEditGrupoId(
        card?.grupoTecnicoIdGlpi != null ? String(card.grupoTecnicoIdGlpi) : glpiCampoIdParaFormulario(j.ticket?.groups_id_assign)
      );
      setEditTecnicoId(
        card?.tecnicoResponsavelIdGlpi != null
          ? String(card.tecnicoResponsavelIdGlpi)
          : glpiCampoIdParaFormulario(j.ticket?.users_id_assign)
      );
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
        const err = j.message ?? "Falha ao enviar comentário.";
        setMsg(err);
        toast({ variant: "destructive", title: "Comentário não enviado", description: err });
        return;
      }
      await abrirDetalhes(detalhesId);
      toast({ variant: "success", title: "Comentário enviado" });
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
        const err = j.message ?? "Falha ao criar tarefa.";
        setMsg(err);
        toast({ variant: "destructive", title: "Tarefa não criada", description: err });
        return;
      }
      await abrirDetalhes(detalhesId);
      toast({ variant: "success", title: "Tarefa criada no chamado" });
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
        const err = j.message ?? "Falha ao criar solução.";
        setMsg(err);
        toast({ variant: "destructive", title: "Solução não registrada", description: err });
        return;
      }
      await abrirDetalhes(detalhesId);
      toast({ variant: "success", title: "Solução registrada" });
    } finally {
      setSolucaoSaving(false);
    }
  }

  async function salvarTicketBasico() {
    if (!detalhesId) return;
    setEditTicketSaving(true);
    setMsg("");
    try {
      const parseNum = (v: string) => {
        const t = v.trim();
        if (!t) return undefined;
        const n = Number.parseInt(t, 10);
        return Number.isFinite(n) ? n : undefined;
      };
      const r = await fetch(`/api/integracao/glpi/chamados/${detalhesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTicketName,
          content: editTicketContent,
          ...(parseNum(editPrioridade) != null ? { priority: parseNum(editPrioridade) } : {}),
          ...(parseNum(editUrgencia) != null ? { urgency: parseNum(editUrgencia) } : {}),
          ...(parseNum(editCategoriaId) != null ? { itilcategories_id: parseNum(editCategoriaId) } : {}),
          ...(parseNum(editGrupoId) != null ? { groups_id_assign: parseNum(editGrupoId) } : {}),
          ...(parseNum(editTecnicoId) != null ? { users_id_assign: parseNum(editTecnicoId) } : {}),
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!r.ok || j.ok === false) {
        const err = j.message ?? "Falha ao atualizar ticket.";
        setMsg(err);
        toast({ variant: "destructive", title: "Ticket não atualizado", description: err });
        return;
      }
      await abrirDetalhes(detalhesId);
      toast({ variant: "success", title: "Ticket atualizado" });
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
  const tarefasProjetoPorColuna = useMemo(() => {
    const m = new Map<GlpiKanbanColuna, TarefaProjetoCard[]>();
    ORDEM_COLUNAS.forEach((c) => m.set(c, []));
    for (const tarefa of tarefasProjetoCards) {
      m.get(tarefa.colunaKanban)?.push(tarefa);
    }
    return m;
  }, [tarefasProjetoCards]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="text-xs text-muted-foreground shrink-0">Quero ver por</span>
            <div className="w-[160px] shrink-0">
              <Select value={contexto} onValueChange={(v) => setContexto(v as "contratos" | "metas" | "projetos")}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="metas">Metas</SelectItem>
                  <SelectItem value="projetos">Projetos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contexto === "contratos" && (
              <>
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
              </>
            )}
            {contexto === "metas" && (
              <>
                <span className="text-xs text-muted-foreground shrink-0">Meta</span>
                <div className="w-[320px] shrink-0">
                  <Select value={metaIdSelecionada} onValueChange={setMetaIdSelecionada}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione a meta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todas__">Todas as metas</SelectItem>
                      {metasFiltro.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {contexto === "projetos" && (
              <>
                <span className="text-xs text-muted-foreground shrink-0">Projeto</span>
                <div className="w-[320px] shrink-0">
                  <Select value={projetoIdSelecionado} onValueChange={setProjetoIdSelecionado}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos os projetos</SelectItem>
                      {projetosFiltro.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <span className="text-xs text-muted-foreground shrink-0">Mostrar</span>
            <div className="w-[180px] shrink-0">
              <Select value={mostrarVinculo} onValueChange={(v) => setMostrarVinculo(v as "todos" | "com" | "sem")}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com">Com vínculo</SelectItem>
                  <SelectItem value="sem">Sem vínculo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={sincronizar} disabled={loading} className="shrink-0">
              Buscar no sistema de chamados
            </Button>
            {!standalone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const w = window.open(
                    "/kanban?standalone=1",
                    "kanban_janela",
                    `popup=yes,width=${window.screen.availWidth},height=${window.screen.availHeight},left=0,top=0`
                  );
                  w?.focus();
                  try {
                    w?.moveTo(0, 0);
                    w?.resizeTo(window.screen.availWidth, window.screen.availHeight);
                  } catch {
                    // Ignora falha de resize/move por política do navegador.
                  }
                }}
              >
                Abrir em janela única
              </Button>
            )}
            {msg && <span className="text-xs text-muted-foreground shrink-0">{msg}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex cursor-wait justify-center rounded-xl bg-background/55 pt-16 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="h-fit rounded-md border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              Carregando quadro…
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ORDEM_COLUNAS.map((col) => {
          const nCh = porColuna.get(col)?.length ?? 0;
          const nTp = tarefasProjetoPorColuna.get(col)?.length ?? 0;
          const nTotal = nCh + nTp;
          return (
          <Card key={col} className="flex min-h-[260px] flex-col overflow-hidden border shadow-sm">
            <CardHeader className={cn("shrink-0 space-y-0.5 border-b pb-3 pt-3", colunaClasses(col).header)}>
              <CardTitle className={cn("text-sm font-semibold leading-tight", colunaClasses(col).title)}>
                {GLPI_KANBAN_LABELS[col]}
              </CardTitle>
              <p className="text-[11px] font-normal text-muted-foreground">
                {nCh} chamado(s) · {nTp} tarefa(s) projeto
              </p>
            </CardHeader>
            <CardContent
              className={cn(
                "flex max-h-[min(68vh,520px)] min-h-[88px] flex-1 flex-col gap-2 overflow-y-auto py-3 transition-colors",
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
              {!loading && nTotal === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-2 py-8 text-center">
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Nenhum chamado nem tarefa de projeto nesta coluna com os filtros atuais.
                  </p>
                </div>
              ) : null}
              {(porColuna.get(col) ?? []).map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "space-y-2 rounded-md border p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-opacity",
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
                  <p className="text-[13px] font-semibold leading-snug">#{c.glpiTicketId} · {c.titulo}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium">
                      Meta: {(c.desdobramentosMeta?.length ?? 0) > 0 ? "Sim" : "Não"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{c.statusLabel ?? `St. ${c.statusGlpi}`}</span>
                    {" · "}Prio {c.prioridade ?? "-"} · Urg {c.urgencia ?? "-"}
                  </p>
                  {(c.grupoTecnicoNome || c.tecnicoResponsavelNome) && (
                    <p className="text-xs text-muted-foreground">
                      {c.grupoTecnicoNome ? `Grupo: ${c.grupoTecnicoNome}. ` : ""}
                      {c.tecnicoResponsavelNome ? `Técnico: ${c.tecnicoResponsavelNome}.` : ""}
                    </p>
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8"
                      onClick={() => void abrirDetalhes(c.glpiTicketId)}
                    >
                      Editar chamado
                    </Button>
                  </div>
                </div>
              ))}
              {(tarefasProjetoPorColuna.get(col) ?? []).map((t) => (
                <div
                  key={`proj-${t.id}`}
                  className={cn("space-y-2 rounded-md border p-2.5 shadow-sm", cardClasses(t.colunaKanban))}
                >
                  <p className="text-[13px] font-semibold leading-snug">
                    <span className="text-primary">[PROJETO]</span> {t.titulo}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Projeto: {t.projeto.nome}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium">
                      Responsável: {t.responsavelGlpiNome?.trim() || t.responsavel?.trim() || "-"}
                    </span>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium">
                      Vinculado ao chamado: {t.glpiChamado ? "Sim" : "Não"}
                    </span>
                  </div>
                  {t.glpiChamado ? (
                    <p className="text-xs text-muted-foreground">
                      Chamado: #{t.glpiChamado.glpiTicketId} - {t.glpiChamado.titulo}
                    </p>
                  ) : null}
                  {t.prazo ? (
                    <p className="text-xs text-muted-foreground">
                      Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status da tarefa:</span>
                    <Select
                      value={t.status}
                      onValueChange={async (v) => {
                        const r = await fetch(`/api/projetos/tarefas/${t.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: v }),
                        });
                        if (!r.ok) {
                          const j = await r.json().catch(() => ({}));
                          const err = (j as { message?: string }).message ?? "Falha ao atualizar tarefa de projeto";
                          setMsg(err);
                          toast({ variant: "destructive", title: "Tarefa de projeto", description: err });
                          return;
                        }
                        await carregar();
                        toast({ variant: "success", title: "Status da tarefa atualizado" });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StatusProjeto.NAO_INICIADO}>Não iniciado</SelectItem>
                        <SelectItem value={StatusProjeto.EM_ANDAMENTO}>Em andamento</SelectItem>
                        <SelectItem value={StatusProjeto.BLOQUEADO}>Bloqueado</SelectItem>
                        <SelectItem value={StatusProjeto.CONCLUIDO}>Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          );
        })}
        </div>
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
                <p className="text-sm font-medium">Linha do tempo</p>
                <div className="rounded-md border p-3 space-y-3 max-h-[440px] overflow-auto">
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
                      const autor = actorLabel(f);
                      items.push({
                        kind: "comentario",
                        date: f.date ?? "",
                        title: "Comentário",
                        meta: `${autor ? `por ${autor}` : ""}${f.is_private ? `${autor ? " • " : ""}privado` : ""}`.trim() || undefined,
                        content: String(f.content ?? ""),
                      });
                    }
                    for (const t of detalhes.tasks) {
                      const autor = actorLabel(t);
                      items.push({
                        kind: "tarefa",
                        date: t.date ?? "",
                        title: "Tarefa",
                        meta: `${autor ? `por ${autor}` : ""}${t.is_private ? `${autor ? " • " : ""}privada` : ""}${
                          t.state != null ? ` • estado ${t.state}` : ""
                        }`.trim() || undefined,
                        content: String(t.content ?? ""),
                      });
                    }
                    for (const s of detalhes.solutions) {
                      const autor = actorLabel(s);
                      items.push({
                        kind: "solucao",
                        date: s.date_creation ?? "",
                        title: "Solução",
                        meta: `${autor ? `por ${autor}` : ""}${s.status != null ? `${autor ? " • " : ""}status ${s.status}` : ""}`.trim() || undefined,
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

              <details className="rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">Editar ticket (campos principais)</summary>
                <div className="mt-3 space-y-2">
                  <Input value={editTicketName} onChange={(e) => setEditTicketName(e.target.value)} placeholder="Título" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Prioridade"
                      value={editPrioridade}
                      onChange={(e) => setEditPrioridade(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Urgência"
                      value={editUrgencia}
                      onChange={(e) => setEditUrgencia(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Select value={editCategoriaId || "__none__"} onValueChange={(v) => setEditCategoriaId(v === "__none__" ? "" : v)}>
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
                    <Select value={editGrupoId || "__none__"} onValueChange={(v) => setEditGrupoId(v === "__none__" ? "" : v)}>
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
                      value={editTecnicoId || "__none__"}
                      onValueChange={(v) => setEditTecnicoId(v === "__none__" ? "" : v)}
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
                  </div>
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
              </details>

              <details className="rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">Novo comentário</summary>
                <div className="mt-3 space-y-2">
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
              </details>

              <details className="rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">Nova tarefa</summary>
                <div className="mt-3 space-y-2">
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
              </details>

              <details className="rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">Nova solução</summary>
                <div className="mt-3 space-y-2">
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
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
