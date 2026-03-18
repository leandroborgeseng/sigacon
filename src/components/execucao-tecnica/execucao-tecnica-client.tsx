"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnidadeMedicaoCatalogo } from "@prisma/client";
import { Plus, RefreshCw, FileText, Trash2, Download } from "lucide-react";

const SENT = "__nenhum__";
const UNIDADE_LABEL: Record<UnidadeMedicaoCatalogo, string> = {
  UST: "UST",
  HORA: "Hora",
  UNIDADE: "Unidade",
  FORNECIMENTO: "Fornecimento (entrega)",
};

type ContratoOpt = { id: string; nome: string; numeroContrato: string; valorUnitarioUst: number | null };

export function ExecucaoTecnicaClient(props: {
  contratos: ContratoOpt[];
  podeEditar: boolean;
  isAdmin: boolean;
}) {
  const { contratos, podeEditar, isAdmin } = props;
  const now = new Date();
  const [contratoId, setContratoId] = useState(contratos[0]?.id ?? "");
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  const [servicos, setServicos] = useState<
    Array<{
      id: string;
      nome: string;
      unidadeMedicao: UnidadeMedicaoCatalogo;
      valorUnitario: unknown;
      slaTexto: string | null;
      formaComprovacao: string | null;
      ativo: boolean;
    }>
  >([]);
  const [tiposUst, setTiposUst] = useState<
    Array<{ id: string; nome: string; categoria: string; complexidade: string | null; ustFixo: unknown }>
  >([]);
  const [lancamentos, setLancamentos] = useState<
    Array<{
      id: string;
      quantidade: number;
      totalUst: unknown;
      valorMonetario: unknown;
      evidenciaGlpiTicketId: string | null;
      evidenciaUrl: string | null;
      tipoAtividade: { nome: string };
      servicoCatalogo: { nome: string } | null;
      anexoEvidencia: { id: string; nomeOriginal: string; nomeArquivo: string } | null;
    }>
  >([]);
  const [relatorio, setRelatorio] = useState<Record<string, unknown> | null>(null);
  const [ustAno, setUstAno] = useState<{
    totalUst: number;
    limiteUstAno: number | null;
    limiteValorUstAno: number | null;
    totalValorUst: number;
    pctUst: number | null;
    pctValor: number | null;
  } | null>(null);

  const [openServico, setOpenServico] = useState(false);
  const [openLanc, setOpenLanc] = useState(false);
  const [servForm, setServForm] = useState<{
    nome: string;
    unidadeMedicao: UnidadeMedicaoCatalogo;
    valorUnitario: string;
    slaTexto: string;
    formaComprovacao: string;
    descricao: string;
  }>({
    nome: "",
    unidadeMedicao: UnidadeMedicaoCatalogo.UST,
    valorUnitario: "",
    slaTexto: "",
    formaComprovacao: "",
    descricao: "",
  });
  const [lancForm, setLancForm] = useState({
    tipoAtividadeUstId: "",
    servicoCatalogoId: "",
    quantidade: "1",
    evidenciaGlpiTicketId: "",
    evidenciaUrl: "",
    evidenciaDescricao: "",
  });
  const [lastLancId, setLastLancId] = useState<string | null>(null);

  const loadServicos = useCallback(async () => {
    if (!contratoId) return;
    const r = await fetch(`/api/contratos/${contratoId}/servicos-catalogo`);
    if (r.ok) setServicos(await r.json());
  }, [contratoId]);

  const loadTipos = useCallback(async () => {
    const r = await fetch("/api/tipos-atividade-ust");
    if (r.ok) setTiposUst(await r.json());
  }, []);

  const loadLancamentos = useCallback(async () => {
    if (!contratoId) return;
    const r = await fetch(`/api/contratos/${contratoId}/lancamentos-ust?ano=${ano}&mes=${mes}`);
    if (r.ok) setLancamentos(await r.json());
  }, [contratoId, ano, mes]);

  const loadRelatorio = useCallback(async () => {
    if (!contratoId) return;
    const r = await fetch(`/api/contratos/${contratoId}/relatorio-medicao-mensal?ano=${ano}&mes=${mes}`);
    if (r.ok) setRelatorio(await r.json());
  }, [contratoId, ano, mes]);

  const loadUstAcumulado = useCallback(async () => {
    if (!contratoId) return;
    const r = await fetch(`/api/contratos/${contratoId}/ust-acumulado?ano=${ano}`);
    if (r.ok) {
      const j = await r.json();
      setUstAno({
        totalUst: j.totalUst,
        limiteUstAno: j.limiteUstAno,
        limiteValorUstAno: j.limiteValorUstAno,
        totalValorUst: j.totalValorUst,
        pctUst: j.pctUst,
        pctValor: j.pctValor,
      });
    } else {
      setUstAno(null);
    }
  }, [contratoId, ano]);

  useEffect(() => {
    loadServicos();
    loadLancamentos();
    loadRelatorio();
    loadUstAcumulado();
  }, [loadServicos, loadLancamentos, loadRelatorio, loadUstAcumulado]);

  useEffect(() => {
    loadTipos();
  }, [loadTipos]);

  async function criarServico(e: React.FormEvent) {
    e.preventDefault();
    const vu = parseFloat(servForm.valorUnitario.replace(",", "."));
    if (!servForm.nome.trim() || !(vu >= 0)) return;
    const r = await fetch(`/api/contratos/${contratoId}/servicos-catalogo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: servForm.nome.trim(),
        descricao: servForm.descricao.trim() || null,
        unidadeMedicao: servForm.unidadeMedicao,
        valorUnitario: vu,
        slaTexto: servForm.slaTexto.trim() || null,
        formaComprovacao: servForm.formaComprovacao.trim() || null,
      }),
    });
    if (r.ok) {
      setOpenServico(false);
      setServForm({
        nome: "",
        unidadeMedicao: UnidadeMedicaoCatalogo.UST,
        valorUnitario: "",
        slaTexto: "",
        formaComprovacao: "",
        descricao: "",
      });
      loadServicos();
    }
  }

  async function criarLancamento(e: React.FormEvent) {
    e.preventDefault();
    if (!lancForm.tipoAtividadeUstId) return;
    const body: Record<string, unknown> = {
      tipoAtividadeUstId: lancForm.tipoAtividadeUstId,
      competenciaAno: ano,
      competenciaMes: mes,
      quantidade: parseInt(lancForm.quantidade, 10) || 1,
      evidenciaGlpiTicketId: lancForm.evidenciaGlpiTicketId.trim() || null,
      evidenciaUrl: lancForm.evidenciaUrl.trim() || null,
      evidenciaDescricao: lancForm.evidenciaDescricao.trim() || null,
    };
    if (lancForm.servicoCatalogoId && lancForm.servicoCatalogoId !== SENT) {
      body.servicoCatalogoId = lancForm.servicoCatalogoId;
    }
    const r = await fetch(`/api/contratos/${contratoId}/lancamentos-ust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = await r.json();
      setLastLancId(j.id);
      setOpenLanc(false);
      setLancForm({
        tipoAtividadeUstId: "",
        servicoCatalogoId: "",
        quantidade: "1",
        evidenciaGlpiTicketId: "",
        evidenciaUrl: "",
        evidenciaDescricao: "",
      });
      loadLancamentos();
      loadRelatorio();
      loadUstAcumulado();
    } else {
      const err = await r.json();
      alert(err.message ?? "Erro ao lançar UST");
    }
  }

  async function uploadEvidencia(lid: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/contratos/${contratoId}/lancamentos-ust/${lid}/anexo`, {
      method: "POST",
      body: fd,
    });
    if (r.ok) loadLancamentos();
  }

  async function excluirLanc(lid: string) {
    if (!confirm("Excluir este lançamento UST?")) return;
    await fetch(`/api/contratos/${contratoId}/lancamentos-ust/${lid}`, { method: "DELETE" });
    loadLancamentos();
    loadRelatorio();
    loadUstAcumulado();
  }

  async function excluirServ(sid: string) {
    if (!confirm("Excluir serviço do catálogo?")) return;
    await fetch(`/api/contratos/${contratoId}/servicos-catalogo/${sid}`, { method: "DELETE" });
    loadServicos();
  }

  async function atualizarMedicao() {
    await fetch("/api/medicoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contratoId, ano, mes }),
    });
    loadRelatorio();
    loadUstAcumulado();
  }

  async function baixarRelatorioXlsx() {
    if (!contratoId) return;
    const r = await fetch(
      `/api/contratos/${contratoId}/relatorio-medicao-mensal/export?ano=${ano}&mes=${mes}`
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert((err as { message?: string }).message ?? "Erro ao baixar planilha");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-medicao-${ano}-${mes}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const c = contratos.find((x) => x.id === contratoId);

  if (!contratos.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cadastre um contrato para usar o catálogo e lançamentos UST.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2 min-w-[220px]">
          <Label>Contrato</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contratos.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Competência</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              className="w-24"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10) || ano)}
            />
            <Select value={String(mes)} onValueChange={(v) => setMes(parseInt(v, 10))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadRelatorio(); loadLancamentos(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {c && (
        <p className="text-sm text-muted-foreground">
          Valor UST de referência do contrato:{" "}
          <strong>
            {c.valorUnitarioUst != null ? `R$ ${c.valorUnitarioUst.toFixed(4)}` : "não definido"}
          </strong>{" "}
          — defina em <Link href={`/contratos/${c.id}`} className="underline">editar contrato</Link> se não
          usar apenas o catálogo.
        </p>
      )}

      {ustAno &&
        (ustAno.limiteUstAno != null || ustAno.limiteValorUstAno != null) && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              (ustAno.pctUst != null && ustAno.pctUst >= 100) ||
              (ustAno.pctValor != null && ustAno.pctValor >= 100)
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : (ustAno.pctUst != null && ustAno.pctUst >= 85) ||
                    (ustAno.pctValor != null && ustAno.pctValor >= 85)
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                  : "border-muted bg-muted/30"
            }`}
          >
            <strong className="block mb-1">Consumo UST no ano {ano}</strong>
            {ustAno.limiteUstAno != null && ustAno.limiteUstAno > 0 && (
              <span>
                UST: {ustAno.totalUst.toFixed(2)} / {ustAno.limiteUstAno}
                {ustAno.pctUst != null && ` (${ustAno.pctUst}% do teto)`}
              </span>
            )}
            {ustAno.limiteValorUstAno != null && ustAno.limiteValorUstAno > 0 && (
              <span className={ustAno.limiteUstAno ? " block mt-1" : ""}>
                Valor UST:{" "}
                {ustAno.totalValorUst.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                /{" "}
                {ustAno.limiteValorUstAno.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                {ustAno.pctValor != null && ` (${ustAno.pctValor}%)`}
              </span>
            )}
          </div>
        )}

      <Tabs defaultValue="catalogo">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="catalogo">Catálogo de serviços</TabsTrigger>
          <TabsTrigger value="ust">Lançamentos UST</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório mensal</TabsTrigger>
          {isAdmin && <TabsTrigger value="tipos">Tipos UST (admin)</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Serviços contratados</CardTitle>
                <CardDescription>Unidade, valor, SLA e forma de comprovação.</CardDescription>
              </div>
              {podeEditar && (
                <Button size="sm" onClick={() => setOpenServico(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo serviço
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor unit.</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Comprovação</TableHead>
                    {podeEditar && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum serviço. Cadastre linhas do edital/contrato.
                      </TableCell>
                    </TableRow>
                  ) : (
                    servicos.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.nome}</TableCell>
                        <TableCell>{UNIDADE_LABEL[s.unidadeMedicao]}</TableCell>
                        <TableCell className="text-right">
                          {Number(s.valorUnitario).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{s.slaTexto ?? "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {s.formaComprovacao ?? "—"}
                        </TableCell>
                        {podeEditar && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => excluirServ(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ust" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Lançamentos com evidência</CardTitle>
                <CardDescription>
                  Cada UST exige ticket GLPI, URL ou descrição (mín. 10 caracteres); pode anexar arquivo após
                  criar.
                </CardDescription>
              </div>
              {podeEditar && (
                <Button size="sm" onClick={() => setOpenLanc(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo lançamento
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="text-right">UST</TableHead>
                    <TableHead className="text-right">R$</TableHead>
                    <TableHead>Evidência</TableHead>
                    <TableHead>Anexo</TableHead>
                    {podeEditar && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento nesta competência.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lancamentos.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div>{l.tipoAtividade.nome}</div>
                          {l.servicoCatalogo && (
                            <div className="text-xs text-muted-foreground">{l.servicoCatalogo.nome}</div>
                          )}
                        </TableCell>
                        <TableCell>{l.quantidade}</TableCell>
                        <TableCell className="text-right">{Number(l.totalUst).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {Number(l.valorMonetario).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs">
                          {l.evidenciaGlpiTicketId && (
                            <div>GLPI: {l.evidenciaGlpiTicketId}</div>
                          )}
                          {l.evidenciaUrl && (
                            <a href={l.evidenciaUrl} className="text-primary underline block truncate" target="_blank" rel="noreferrer">
                              link
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.anexoEvidencia ? (
                            <a
                              href={`/api/anexos/download/${l.anexoEvidencia.nomeArquivo}`}
                              className="inline-flex items-center gap-1 text-sm text-primary"
                            >
                              <FileText className="h-4 w-4" />
                              {l.anexoEvidencia.nomeOriginal}
                            </a>
                          ) : podeEditar ? (
                            <label className="text-xs text-muted-foreground cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadEvidencia(l.id, f);
                                }}
                              />
                              <span className="underline">Enviar</span>
                            </label>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        {podeEditar && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => excluirLanc(l.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {lastLancId && (
            <p className="text-sm text-muted-foreground">
              Último lançamento criado. Você pode enviar anexo de evidência na tabela acima.
            </p>
          )}
        </TabsContent>

        <TabsContent value="relatorio" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={atualizarMedicao}>
              Recalcular checklist (itens)
            </Button>
            <Button variant="outline" size="sm" onClick={baixarRelatorioXlsx}>
              <Download className="mr-2 h-4 w-4" />
              Baixar XLSX
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/medicoes">Medição mensal</Link>
            </Button>
          </div>
          {relatorio && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Checklist (KPIs)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Itens atendidos:{" "}
                    <strong>{(relatorio.checklist as { totalItensAtendidos: number }).totalItensAtendidos}</strong> /{" "}
                    {(relatorio.checklist as { totalItensValidos: number }).totalItensValidos}
                  </p>
                  <p>
                    % cumprido:{" "}
                    <strong>
                      {(relatorio.checklist as { percentualCumprido: number }).percentualCumprido.toFixed(2)}%
                    </strong>
                  </p>
                  <p>
                    Valor devido (checklist):{" "}
                    <strong>
                      {(relatorio.checklist as { valorDevidoMesChecklist: number }).valorDevidoMesChecklist.toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" }
                      )}
                    </strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">UST no mês</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Total UST: <strong>{(relatorio.ust as { totalUstMes: number }).totalUstMes.toFixed(2)}</strong>
                  </p>
                  <p>
                    Valor UST:{" "}
                    <strong>
                      {(relatorio.ust as { valorMedicaoUstMes: number }).valorMedicaoUstMes.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consolidado</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-2xl font-semibold">
                    {(relatorio.consolidado as { valorTotalMes: number }).valorTotalMes.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {(relatorio.consolidado as { formula: string }).formula}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="tipos">
            <TiposUstAdmin />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={openServico} onOpenChange={setOpenServico}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo serviço no catálogo</DialogTitle>
          </DialogHeader>
          <form onSubmit={criarServico} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={servForm.nome} onChange={(e) => setServForm((s) => ({ ...s, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Unidade de medição</Label>
              <Select
                value={servForm.unidadeMedicao}
                onValueChange={(v) =>
                  setServForm((s) => ({ ...s, unidadeMedicao: v as UnidadeMedicaoCatalogo }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UnidadeMedicaoCatalogo).map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIDADE_LABEL[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor unitário (R$)</Label>
              <Input
                value={servForm.valorUnitario}
                onChange={(e) => setServForm((s) => ({ ...s, valorUnitario: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>SLA (texto)</Label>
              <Input
                placeholder="Ex.: 10 dias úteis"
                value={servForm.slaTexto}
                onChange={(e) => setServForm((s) => ({ ...s, slaTexto: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de comprovação</Label>
              <Input
                placeholder="Ex.: homologação do usuário"
                value={servForm.formaComprovacao}
                onChange={(e) => setServForm((s) => ({ ...s, formaComprovacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={servForm.descricao}
                onChange={(e) => setServForm((s) => ({ ...s, descricao: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openLanc} onOpenChange={setOpenLanc}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento UST</DialogTitle>
          </DialogHeader>
          <form onSubmit={criarLancamento} className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo de atividade (UST fixa)</Label>
              <Select
                value={lancForm.tipoAtividadeUstId || SENT}
                onValueChange={(v) => setLancForm((s) => ({ ...s, tipoAtividadeUstId: v === SENT ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENT}>—</SelectItem>
                  {tiposUst.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      [{t.complexidade ?? "—"}] {t.nome} · {Number(t.ustFixo)} UST · {t.categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serviço do catálogo (opcional)</Label>
              <Select
                value={lancForm.servicoCatalogoId || SENT}
                onValueChange={(v) => setLancForm((s) => ({ ...s, servicoCatalogoId: v === SENT ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Usar preço do contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENT}>Valor UST do contrato</SelectItem>
                  {servicos.filter((s) => s.ativo).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade (repetições)</Label>
              <Input
                type="number"
                min={1}
                value={lancForm.quantidade}
                onChange={(e) => setLancForm((s) => ({ ...s, quantidade: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ID ticket GLPI</Label>
              <Input
                value={lancForm.evidenciaGlpiTicketId}
                onChange={(e) => setLancForm((s) => ({ ...s, evidenciaGlpiTicketId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>URL evidência (repositório, documento)</Label>
              <Input
                value={lancForm.evidenciaUrl}
                onChange={(e) => setLancForm((s) => ({ ...s, evidenciaUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição da evidência (mín. 10 caracteres se sem GLPI/URL)</Label>
              <Textarea
                rows={3}
                value={lancForm.evidenciaDescricao}
                onChange={(e) => setLancForm((s) => ({ ...s, evidenciaDescricao: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TiposUstAdmin() {
  const [rows, setRows] = useState<
    Array<{ id: string; nome: string; categoria: string; complexidade: string | null; ustFixo: unknown; codigo: string | null }>
  >([]);
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    complexidade: "Média" as "Baixa" | "Média" | "Alta",
    ustFixo: "4",
  });

  async function load() {
    const r = await fetch("/api/tipos-atividade-ust");
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/tipos-atividade-ust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        categoria: form.categoria || "Outros",
        complexidade: form.complexidade,
        ustFixo: parseFloat(form.ustFixo),
      }),
    });
    setForm({ nome: "", categoria: "", complexidade: "Média", ustFixo: "4" });
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo global UST (seções 4.1–4.11)</CardTitle>
        <CardDescription>
          Itens padrão vêm do seed. Aqui você pode incluir exceções contratuais (sem código fixo).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={criar} className="flex flex-wrap gap-2 items-end">
          <Input
            placeholder="Nome do serviço"
            className="max-w-xs"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <Input
            placeholder="Categoria / grupo"
            className="w-48"
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
          />
          <Select
            value={form.complexidade}
            onValueChange={(v) => setForm((f) => ({ ...f, complexidade: v as "Baixa" | "Média" | "Alta" }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Baixa">Baixa</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            className="w-20"
            value={form.ustFixo}
            onChange={(e) => setForm((f) => ({ ...f, ustFixo: e.target.value }))}
          />
          <Button type="submit">Adicionar</Button>
        </form>
        <div className="max-h-[420px] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód.</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Complex.</TableHead>
                <TableHead>UST</TableHead>
                <TableHead>Grupo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.codigo ?? "—"}</TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.complexidade ?? "—"}</TableCell>
                  <TableCell>{Number(r.ustFixo)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{r.categoria}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
