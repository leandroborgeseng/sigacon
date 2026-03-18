"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { StatusMarcoImplantacao, StatusParcelaPagamento } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Aditivo = {
  id: string;
  numeroAditivo: string;
  dataRegistro: string;
  objeto: string | null;
  valorAnterior: unknown | null;
  valorNovo: unknown | null;
  vigenciaFimAnterior: string | null;
  vigenciaFimNova: string | null;
  observacoes: string | null;
};

type Marco = {
  id: string;
  titulo: string;
  descricao: string | null;
  dataPrevista: string;
  dataRealizada: string | null;
  status: StatusMarcoImplantacao;
  ordem: number;
};

type Parcela = {
  id: string;
  competenciaAno: number;
  competenciaMes: number;
  valorPrevisto: unknown;
  valorPago: unknown | null;
  dataVencimento: string | null;
  dataPagamento: string | null;
  numeroNf: string | null;
  status: StatusParcelaPagamento;
  observacao: string | null;
};

const MARCO_LABEL: Record<StatusMarcoImplantacao, string> = {
  PLANEJADO: "Planejado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  ATRASADO: "Atrasado",
};

const PARCELA_LABEL: Record<StatusParcelaPagamento, string> = {
  PREVISTO: "Previsto",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  PARCIAL: "Parcial",
};

export function ContratoGestaoExtendida({
  contratoId,
  aditivosInicial,
  marcosInicial,
  parcelasInicial,
  podeEditar,
}: {
  contratoId: string;
  aditivosInicial: Aditivo[];
  marcosInicial: Marco[];
  parcelasInicial: Parcela[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [aditivos, setAditivos] = useState(aditivosInicial);
  const [marcos, setMarcos] = useState(marcosInicial);
  const [parcelas, setParcelas] = useState(parcelasInicial);

  useEffect(() => {
    setAditivos(aditivosInicial);
    setMarcos(marcosInicial);
    setParcelas(parcelasInicial);
  }, [aditivosInicial, marcosInicial, parcelasInicial]);

  const [openAd, setOpenAd] = useState(false);
  const [openMc, setOpenMc] = useState(false);
  const [openPar, setOpenPar] = useState(false);
  const [editAd, setEditAd] = useState<Aditivo | null>(null);
  const [editMc, setEditMc] = useState<Marco | null>(null);
  const [editPar, setEditPar] = useState<Parcela | null>(null);

  const [adForm, setAdForm] = useState({
    numeroAditivo: "",
    dataRegistro: new Date().toISOString().slice(0, 10),
    objeto: "",
    valorAnterior: "",
    valorNovo: "",
    vigenciaFimAnterior: "",
    vigenciaFimNova: "",
    observacoes: "",
  });

  const [mcForm, setMcForm] = useState({
    titulo: "",
    descricao: "",
    dataPrevista: new Date().toISOString().slice(0, 10),
    dataRealizada: "",
    status: StatusMarcoImplantacao.PLANEJADO as StatusMarcoImplantacao,
    ordem: "0",
  });

  const [parForm, setParForm] = useState({
    competenciaAno: String(new Date().getFullYear()),
    competenciaMes: String(new Date().getMonth() + 1),
    valorPrevisto: "",
    valorPago: "",
    dataVencimento: "",
    dataPagamento: "",
    numeroNf: "",
    observacao: "",
  });

  function refresh() {
    router.refresh();
    Promise.all([
      fetch(`/api/contratos/${contratoId}/aditivos`).then((r) => r.json()),
      fetch(`/api/contratos/${contratoId}/marcos`).then((r) => r.json()),
      fetch(`/api/contratos/${contratoId}/parcelas`).then((r) => r.json()),
    ]).then(([a, m, p]) => {
      setAditivos(a);
      setMarcos(m);
      setParcelas(p);
    });
  }

  async function salvarAditivo(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      numeroAditivo: adForm.numeroAditivo,
      dataRegistro: adForm.dataRegistro,
      objeto: adForm.objeto || null,
      valorAnterior: adForm.valorAnterior ? parseFloat(adForm.valorAnterior.replace(",", ".")) : null,
      valorNovo: adForm.valorNovo ? parseFloat(adForm.valorNovo.replace(",", ".")) : null,
      vigenciaFimAnterior: adForm.vigenciaFimAnterior || null,
      vigenciaFimNova: adForm.vigenciaFimNova || null,
      observacoes: adForm.observacoes || null,
    };
    const url = editAd
      ? `/api/contratos/${contratoId}/aditivos/${editAd.id}`
      : `/api/contratos/${contratoId}/aditivos`;
    const r = await fetch(url, {
      method: editAd ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setOpenAd(false);
      setEditAd(null);
      setAdForm({
        numeroAditivo: "",
        dataRegistro: new Date().toISOString().slice(0, 10),
        objeto: "",
        valorAnterior: "",
        valorNovo: "",
        vigenciaFimAnterior: "",
        vigenciaFimNova: "",
        observacoes: "",
      });
      refresh();
    }
  }

  async function salvarMarco(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      titulo: mcForm.titulo,
      descricao: mcForm.descricao || null,
      dataPrevista: mcForm.dataPrevista,
      dataRealizada: mcForm.dataRealizada || null,
      status: mcForm.status,
      ordem: parseInt(mcForm.ordem, 10) || 0,
    };
    const url = editMc
      ? `/api/contratos/${contratoId}/marcos/${editMc.id}`
      : `/api/contratos/${contratoId}/marcos`;
    const r = await fetch(url, {
      method: editMc ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setOpenMc(false);
      setEditMc(null);
      setMcForm({
        titulo: "",
        descricao: "",
        dataPrevista: new Date().toISOString().slice(0, 10),
        dataRealizada: "",
        status: StatusMarcoImplantacao.PLANEJADO,
        ordem: "0",
      });
      refresh();
    }
  }

  async function salvarParcela(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      competenciaAno: parseInt(parForm.competenciaAno, 10),
      competenciaMes: parseInt(parForm.competenciaMes, 10),
      valorPrevisto: parseFloat(parForm.valorPrevisto.replace(",", ".")),
      valorPago: parForm.valorPago ? parseFloat(parForm.valorPago.replace(",", ".")) : null,
      dataVencimento: parForm.dataVencimento || null,
      dataPagamento: parForm.dataPagamento || null,
      numeroNf: parForm.numeroNf || null,
      observacao: parForm.observacao || null,
    };
    const url = editPar
      ? `/api/contratos/${contratoId}/parcelas/${editPar.id}`
      : `/api/contratos/${contratoId}/parcelas`;
    const r = await fetch(url, {
      method: editPar ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setOpenPar(false);
      setEditPar(null);
      setParForm({
        competenciaAno: String(new Date().getFullYear()),
        competenciaMes: String(new Date().getMonth() + 1),
        valorPrevisto: "",
        valorPago: "",
        dataVencimento: "",
        dataPagamento: "",
        numeroNf: "",
        observacao: "",
      });
      refresh();
    } else {
      const j = await r.json();
      alert(j.message ?? "Erro");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão ampliada</CardTitle>
        <CardDescription>Aditivos, marcos de implantação e parcelas de pagamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="aditivos">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
            <TabsTrigger value="marcos">Marcos (implantação)</TabsTrigger>
            <TabsTrigger value="parcelas">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="aditivos" className="space-y-4 pt-4">
            {podeEditar && (
              <Button
                size="sm"
                onClick={() => {
                  setEditAd(null);
                  setAdForm({
                    numeroAditivo: "",
                    dataRegistro: new Date().toISOString().slice(0, 10),
                    objeto: "",
                    valorAnterior: "",
                    valorNovo: "",
                    vigenciaFimAnterior: "",
                    vigenciaFimNova: "",
                    observacoes: "",
                  });
                  setOpenAd(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar aditivo
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valores</TableHead>
                  <TableHead>Vigência</TableHead>
                  {podeEditar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {aditivos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center py-6">
                      Nenhum aditivo registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  aditivos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.numeroAditivo}</TableCell>
                      <TableCell>{formatDate(a.dataRegistro)}</TableCell>
                      <TableCell className="text-sm">
                        {a.valorAnterior != null && a.valorNovo != null
                          ? `${formatCurrency(Number(a.valorAnterior))} → ${formatCurrency(Number(a.valorNovo))}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.vigenciaFimNova ? formatDate(a.vigenciaFimNova) : "—"}
                      </TableCell>
                      {podeEditar && (
                        <TableCell className="space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditAd(a);
                              setAdForm({
                                numeroAditivo: a.numeroAditivo,
                                dataRegistro: a.dataRegistro.slice(0, 10),
                                objeto: a.objeto ?? "",
                                valorAnterior: a.valorAnterior != null ? String(a.valorAnterior) : "",
                                valorNovo: a.valorNovo != null ? String(a.valorNovo) : "",
                                vigenciaFimAnterior: a.vigenciaFimAnterior?.slice(0, 10) ?? "",
                                vigenciaFimNova: a.vigenciaFimNova?.slice(0, 10) ?? "",
                                observacoes: a.observacoes ?? "",
                              });
                              setOpenAd(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm("Excluir aditivo?")) return;
                              await fetch(`/api/contratos/${contratoId}/aditivos/${a.id}`, { method: "DELETE" });
                              refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="marcos" className="space-y-4 pt-4">
            {podeEditar && (
              <Button
                size="sm"
                onClick={() => {
                  setEditMc(null);
                  setMcForm({
                    titulo: "",
                    descricao: "",
                    dataPrevista: new Date().toISOString().slice(0, 10),
                    dataRealizada: "",
                    status: StatusMarcoImplantacao.PLANEJADO,
                    ordem: "0",
                  });
                  setOpenMc(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo marco
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marco</TableHead>
                  <TableHead>Previsto</TableHead>
                  <TableHead>Realizado</TableHead>
                  <TableHead>Status</TableHead>
                  {podeEditar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {marcos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhum marco cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  marcos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.titulo}</div>
                        {m.descricao && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{m.descricao}</div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(m.dataPrevista)}</TableCell>
                      <TableCell>{m.dataRealizada ? formatDate(m.dataRealizada) : "—"}</TableCell>
                      <TableCell>{MARCO_LABEL[m.status]}</TableCell>
                      {podeEditar && (
                        <TableCell className="space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditMc(m);
                              setMcForm({
                                titulo: m.titulo,
                                descricao: m.descricao ?? "",
                                dataPrevista: m.dataPrevista.slice(0, 10),
                                dataRealizada: m.dataRealizada?.slice(0, 10) ?? "",
                                status: m.status,
                                ordem: String(m.ordem),
                              });
                              setOpenMc(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm("Excluir marco?")) return;
                              await fetch(`/api/contratos/${contratoId}/marcos/${m.id}`, { method: "DELETE" });
                              refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="parcelas" className="space-y-4 pt-4">
            {podeEditar && (
              <Button
                size="sm"
                onClick={() => {
                  setEditPar(null);
                  setParForm({
                    competenciaAno: String(new Date().getFullYear()),
                    competenciaMes: String(new Date().getMonth() + 1),
                    valorPrevisto: "",
                    valorPago: "",
                    dataVencimento: "",
                    dataPagamento: "",
                    numeroNf: "",
                    observacao: "",
                  });
                  setOpenPar(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova parcela (competência)
              </Button>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Previsto</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>NF</TableHead>
                  {podeEditar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Nenhuma parcela. Uma linha por mês de faturamento.
                    </TableCell>
                  </TableRow>
                ) : (
                  parcelas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.competenciaMes.toString().padStart(2, "0")}/{p.competenciaAno}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(p.valorPrevisto))}</TableCell>
                      <TableCell>
                        {p.valorPago != null ? formatCurrency(Number(p.valorPago)) : "—"}
                      </TableCell>
                      <TableCell>{PARCELA_LABEL[p.status]}</TableCell>
                      <TableCell className="text-sm">{p.numeroNf ?? "—"}</TableCell>
                      {podeEditar && (
                        <TableCell className="space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditPar(p);
                              setParForm({
                                competenciaAno: String(p.competenciaAno),
                                competenciaMes: String(p.competenciaMes),
                                valorPrevisto: String(p.valorPrevisto),
                                valorPago: p.valorPago != null ? String(p.valorPago) : "",
                                dataVencimento: p.dataVencimento?.slice(0, 10) ?? "",
                                dataPagamento: p.dataPagamento?.slice(0, 10) ?? "",
                                numeroNf: p.numeroNf ?? "",
                                observacao: p.observacao ?? "",
                              });
                              setOpenPar(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm("Excluir parcela?")) return;
                              await fetch(`/api/contratos/${contratoId}/parcelas/${p.id}`, { method: "DELETE" });
                              refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={openAd} onOpenChange={setOpenAd}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAd ? "Editar aditivo" : "Novo aditivo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarAditivo} className="space-y-3">
            <div className="space-y-2">
              <Label>Número do aditivo</Label>
              <Input
                value={adForm.numeroAditivo}
                onChange={(e) => setAdForm((f) => ({ ...f, numeroAditivo: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data de registro</Label>
              <Input
                type="date"
                value={adForm.dataRegistro}
                onChange={(e) => setAdForm((f) => ({ ...f, dataRegistro: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Objeto / resumo</Label>
              <Textarea rows={2} value={adForm.objeto} onChange={(e) => setAdForm((f) => ({ ...f, objeto: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Valor anterior (R$)</Label>
                <Input value={adForm.valorAnterior} onChange={(e) => setAdForm((f) => ({ ...f, valorAnterior: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valor novo (R$)</Label>
                <Input value={adForm.valorNovo} onChange={(e) => setAdForm((f) => ({ ...f, valorNovo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Fim vigência (antes)</Label>
                <Input type="date" value={adForm.vigenciaFimAnterior} onChange={(e) => setAdForm((f) => ({ ...f, vigenciaFimAnterior: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fim vigência (nova)</Label>
                <Input type="date" value={adForm.vigenciaFimNova} onChange={(e) => setAdForm((f) => ({ ...f, vigenciaFimNova: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={adForm.observacoes} onChange={(e) => setAdForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openMc} onOpenChange={setOpenMc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMc ? "Editar marco" : "Novo marco"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarMarco} className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={mcForm.titulo} onChange={(e) => setMcForm((f) => ({ ...f, titulo: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={mcForm.descricao} onChange={(e) => setMcForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Data prevista</Label>
                <Input type="date" value={mcForm.dataPrevista} onChange={(e) => setMcForm((f) => ({ ...f, dataPrevista: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data realizada</Label>
                <Input type="date" value={mcForm.dataRealizada} onChange={(e) => setMcForm((f) => ({ ...f, dataRealizada: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={mcForm.status} onValueChange={(v) => setMcForm((f) => ({ ...f, status: v as StatusMarcoImplantacao }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(StatusMarcoImplantacao).map((s) => (
                      <SelectItem key={s} value={s}>
                        {MARCO_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input value={mcForm.ordem} onChange={(e) => setMcForm((f) => ({ ...f, ordem: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPar} onOpenChange={setOpenPar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPar ? "Editar parcela" : "Nova parcela"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarParcela} className="space-y-3">
            {!editPar && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input value={parForm.competenciaAno} onChange={(e) => setParForm((f) => ({ ...f, competenciaAno: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Input type="number" min={1} max={12} value={parForm.competenciaMes} onChange={(e) => setParForm((f) => ({ ...f, competenciaMes: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor previsto (R$)</Label>
              <Input value={parForm.valorPrevisto} onChange={(e) => setParForm((f) => ({ ...f, valorPrevisto: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Valor pago (R$)</Label>
              <Input value={parForm.valorPago} onChange={(e) => setParForm((f) => ({ ...f, valorPago: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={parForm.dataVencimento} onChange={(e) => setParForm((f) => ({ ...f, dataVencimento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Input type="date" value={parForm.dataPagamento} onChange={(e) => setParForm((f) => ({ ...f, dataPagamento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>NF</Label>
              <Input value={parForm.numeroNf} onChange={(e) => setParForm((f) => ({ ...f, numeroNf: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea rows={2} value={parForm.observacao} onChange={(e) => setParForm((f) => ({ ...f, observacao: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
