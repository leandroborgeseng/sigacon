"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TipoContrato, TipoRecursoDatacenter } from "@prisma/client";
import {
  LABEL_TIPO_RECURSO_DATACENTER,
  indiceOrdenacaoTipoDatacenter,
} from "@/lib/datacenter-recursos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ListLoadingSkeleton } from "@/components/ui/list-loading-skeleton";

type Contrato = { id: string; nome: string; tipoContrato: TipoContrato };

type MedicaoDetalhe = {
  id: string;
  ano?: number;
  mes?: number;
  totalItensValidos: number;
  totalItensAtendidos: number;
  totalItensParciais: number;
  totalItensNaoAtendidos: number;
  percentualCumprido: string;
  percentualNaoCumprido: string;
  valorAnualContrato: string;
  valorMensalReferencia: string;
  valorDevidoMes: string;
  valorGlosadoMes: string;
  valorTotalConsolidadoMes?: string | null;
  statusFechamento: string;
  contrato?: { tipoContrato?: TipoContrato };
  consumoDatacenterItens?: Array<{
    itemPrevistoId: string;
    quantidadeUsada: string | number | { toString(): string };
    itemPrevisto: {
      tipo: TipoRecursoDatacenter;
      quantidadeContratada: unknown;
      valorUnitarioMensal: unknown;
    };
  }>;
  consumoDatacenterLicencas?: Array<{
    licencaId: string;
    quantidadeUsada: string | number | { toString(): string };
    licenca: {
      nome: string;
      quantidadeMaxima: unknown;
      valorUnitarioMensal: unknown;
    };
  }>;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  REVISADA: "Revisada",
  HOMOLOGADA: "Homologada",
};

function mapApiPayloadToMedicao(data: Record<string, unknown>): MedicaoDetalhe | null {
  if (!data?.id) return null;
  return {
    id: data.id as string,
    ano: data.ano as number | undefined,
    mes: data.mes as number | undefined,
    totalItensValidos: data.totalItensValidos as number,
    totalItensAtendidos: data.totalItensAtendidos as number,
    totalItensParciais: data.totalItensParciais as number,
    totalItensNaoAtendidos: data.totalItensNaoAtendidos as number,
    percentualCumprido: String(data.percentualCumprido),
    percentualNaoCumprido: String(data.percentualNaoCumprido),
    valorAnualContrato: String(data.valorAnualContrato),
    valorMensalReferencia: String(data.valorMensalReferencia),
    valorDevidoMes: String(data.valorDevidoMes),
    valorGlosadoMes: String(data.valorGlosadoMes),
    valorTotalConsolidadoMes:
      data.valorTotalConsolidadoMes != null ? String(data.valorTotalConsolidadoMes) : null,
    statusFechamento: data.statusFechamento as string,
    contrato: data.contrato as MedicaoDetalhe["contrato"],
    consumoDatacenterItens: data.consumoDatacenterItens as MedicaoDetalhe["consumoDatacenterItens"],
    consumoDatacenterLicencas: data.consumoDatacenterLicencas as MedicaoDetalhe["consumoDatacenterLicencas"],
  };
}

export function MedicoesClient({
  contratos,
  podeEditar,
}: {
  contratos: Contrato[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [contratoId, setContratoId] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [medicao, setMedicao] = useState<MedicaoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [dialogFechar, setDialogFechar] = useState(false);
  const [dialogReabrir, setDialogReabrir] = useState(false);
  const [chkPerc, setChkPerc] = useState(false);
  const [chkUst, setChkUst] = useState(false);
  const [chkBloqueio, setChkBloqueio] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [qtdItensDc, setQtdItensDc] = useState<Record<string, string>>({});
  const [qtdLicDc, setQtdLicDc] = useState<Record<string, string>>({});
  const [salvandoDc, setSalvandoDc] = useState(false);

  const refreshMedicaoDetalhe = useCallback(async (medicaoId: string) => {
    const r = await fetch(`/api/medicoes/${medicaoId}`);
    const data = (await r.json()) as Record<string, unknown>;
    const m = mapApiPayloadToMedicao(data);
    if (m) setMedicao(m);
  }, []);

  useEffect(() => {
    if (!contratoId) {
      setMedicao(null);
      return;
    }
    setLoading(true);
    fetch(
      `/api/medicoes?contratoId=${contratoId}&ano=${ano}&mes=${mes}`
    )
      .then((r) => r.json())
      .then((list: { id?: string; ano?: number; mes?: number }[]) => {
        const found = Array.isArray(list)
          ? list.find((m) => m.ano === ano && m.mes === mes)
          : null;
        if (found && "id" in found) {
          return fetch(`/api/medicoes/${(found as { id: string }).id}`).then((r) => r.json());
        }
        setMedicao(null);
        setLoading(false);
      })
      .then((data: Record<string, unknown> | undefined) => {
        const m = data ? mapApiPayloadToMedicao(data) : null;
        setMedicao(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contratoId, ano, mes]);

  useEffect(() => {
    if (!medicao?.consumoDatacenterItens && !medicao?.consumoDatacenterLicencas) {
      setQtdItensDc({});
      setQtdLicDc({});
      return;
    }
    const qi: Record<string, string> = {};
    for (const c of medicao.consumoDatacenterItens ?? []) {
      qi[c.itemPrevistoId] = String(c.quantidadeUsada ?? "0");
    }
    setQtdItensDc(qi);
    const ql: Record<string, string> = {};
    for (const c of medicao.consumoDatacenterLicencas ?? []) {
      ql[c.licencaId] = String(c.quantidadeUsada ?? "0");
    }
    setQtdLicDc(ql);
  }, [medicao?.id, medicao?.consumoDatacenterItens, medicao?.consumoDatacenterLicencas]);

  async function salvarConsumoDatacenter() {
    if (!medicao?.id || !podeEditar) return;
    setErroApi(null);
    setSalvandoDc(true);
    try {
      const itens = Object.entries(qtdItensDc).map(([itemPrevistoId, v]) => ({
        itemPrevistoId,
        quantidadeUsada: Number(String(v).replace(",", ".")) || 0,
      }));
      const licencas = Object.entries(qtdLicDc).map(([licencaId, v]) => ({
        licencaId,
        quantidadeUsada: Number(String(v).replace(",", ".")) || 0,
      }));
      const res = await fetch(`/api/medicoes/${medicao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumoDatacenter: { itens, licencas } }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (errBody as { message?: string }).message ?? "Erro ao salvar consumo";
        setErroApi(msg);
        toast({ variant: "destructive", title: "Erro ao salvar consumo", description: msg });
        return;
      }
      await refreshMedicaoDetalhe(medicao.id);
      router.refresh();
      toast({ variant: "success", title: "Consumo salvo", description: "Valores de datacenter atualizados." });
    } finally {
      setSalvandoDc(false);
    }
  }

  async function gerarOuRecalcular() {
    if (!contratoId || !podeEditar) return;
    setErroApi(null);
    setGerando(true);
    try {
      const res = await fetch("/api/medicoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoId, ano, mes }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? "Erro ao gerar medição";
        setErroApi(msg);
        toast({ variant: "destructive", title: "Erro ao gerar medição", description: msg });
        return;
      }
      if (res.ok && data.id) {
        await refreshMedicaoDetalhe(data.id as string);
        router.refresh();
        toast({ variant: "success", title: "Medição gerada ou atualizada" });
      }
    } finally {
      setGerando(false);
    }
  }

  async function recalcular() {
    if (!medicao?.id || !podeEditar) return;
    setErroApi(null);
    setGerando(true);
    try {
      const res = await fetch(`/api/medicoes/${medicao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalcular: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? "Erro ao recalcular";
        setErroApi(msg);
        toast({ variant: "destructive", title: "Erro ao recalcular", description: msg });
        return;
      }
      if (medicao?.id) await refreshMedicaoDetalhe(medicao.id);
      router.refresh();
      toast({ variant: "success", title: "Medição recalculada" });
    } finally {
      setGerando(false);
    }
  }

  async function recalcularDentroDialog() {
    await recalcular();
  }

  async function confirmarFechar() {
    if (!medicao?.id || !chkPerc || !chkUst || !chkBloqueio) return;
    setGerando(true);
    setErroApi(null);
    try {
      const res = await fetch(`/api/medicoes/${medicao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusFechamento: "FECHADA" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? "Erro ao fechar";
        setErroApi(msg);
        toast({ variant: "destructive", title: "Erro ao fechar medição", description: msg });
        return;
      }
      setMedicao((prev) => (prev ? { ...prev, statusFechamento: data.statusFechamento } : null));
      setDialogFechar(false);
      setChkPerc(false);
      setChkUst(false);
      setChkBloqueio(false);
      router.refresh();
      toast({ variant: "success", title: "Medição fechada" });
    } finally {
      setGerando(false);
    }
  }

  async function confirmarReabrir() {
    if (!medicao?.id) return;
    setGerando(true);
    setErroApi(null);
    try {
      const res = await fetch(`/api/medicoes/${medicao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusFechamento: "ABERTA" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? "Erro ao reabrir";
        setErroApi(msg);
        toast({ variant: "destructive", title: "Erro ao reabrir", description: msg });
        return;
      }
      setMedicao((prev) => (prev ? { ...prev, statusFechamento: data.statusFechamento } : null));
      setDialogReabrir(false);
      router.refresh();
      toast({ variant: "success", title: "Medição reaberta" });
    } finally {
      setGerando(false);
    }
  }

  const medicaoAberta = medicao?.statusFechamento === "ABERTA";
  const contratoSel = contratos.find((c) => c.id === contratoId);
  const isDatacenter = contratoSel?.tipoContrato === TipoContrato.DATACENTER;
  const itensDcOrdenados = medicao?.consumoDatacenterItens
    ? [...medicao.consumoDatacenterItens].sort(
        (a, b) =>
          indiceOrdenacaoTipoDatacenter(a.itemPrevisto.tipo) -
          indiceOrdenacaoTipoDatacenter(b.itemPrevisto.tipo)
      )
    : [];

  const previewFaturamentoDc = useMemo(() => {
    if (!medicao?.consumoDatacenterItens && !medicao?.consumoDatacenterLicencas) return 0;
    let s = 0;
    for (const row of medicao.consumoDatacenterItens ?? []) {
      const vu = row.itemPrevisto.valorUnitarioMensal;
      if (vu == null) continue;
      const raw = qtdItensDc[row.itemPrevistoId];
      const q = Number(String(raw ?? 0).replace(",", "."));
      if (!Number.isFinite(q)) continue;
      s += q * Number(vu);
    }
    for (const row of medicao.consumoDatacenterLicencas ?? []) {
      const iv = row.licenca.valorUnitarioMensal;
      if (iv == null) continue;
      const raw = qtdLicDc[row.licencaId];
      const q = Number(String(raw ?? 0).replace(",", "."));
      if (!Number.isFinite(q)) continue;
      s += q * Number(iv);
    }
    return Math.round(s * 100) / 100;
  }, [medicao, qtdItensDc, qtdLicDc]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar competência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={contratoId || "__nenhum__"}
              onValueChange={(v) => setContratoId(v === "__nenhum__" ? "" : v)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__nenhum__">Selecione o contrato</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[ano, ano - 1, ano - 2].map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((nome, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2 flex-wrap">
              <Button
                onClick={gerarOuRecalcular}
                disabled={!contratoId || gerando || !podeEditar}
              >
                {medicao ? "Gerar/Atualizar" : "Gerar medição"}
              </Button>
              {medicao && podeEditar && (
                <Button variant="outline" onClick={recalcular} disabled={gerando}>
                  Recalcular
                </Button>
              )}
            </div>
            {!podeEditar && (
              <p className="text-xs text-muted-foreground">
                Sua permissão permite apenas visualizar. Geração, recálculo e fechamento exigem permissão de edição em Medição mensal.
              </p>
            )}
            {erroApi && <p className="text-sm text-destructive">{erroApi}</p>}
          </div>
        </CardContent>
      </Card>

      {loading && !medicao ? (
        <ListLoadingSkeleton linhas={6} className="max-w-lg" />
      ) : loading ? (
        <p className="text-xs text-muted-foreground">Atualizando dados da medição…</p>
      ) : null}

      {medicao && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>
              Medição – {MESES[mes - 1]} / {ano}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Valor anual do contrato</p>
              <p className="text-2xl font-bold">
                {formatCurrency(medicao.valorAnualContrato)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor mensal de referência</p>
              <p className="text-2xl font-bold">
                {formatCurrency(medicao.valorMensalReferencia)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens válidos / Atendidos / Parciais / Não atendidos</p>
              <p className="text-lg">
                {medicao.totalItensValidos} / {medicao.totalItensAtendidos} /{" "}
                {medicao.totalItensParciais} / {medicao.totalItensNaoAtendidos}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Percentual cumprido / não cumprido</p>
              <p className="text-lg">
                {Number(medicao.percentualCumprido).toFixed(2)}% /{" "}
                {Number(medicao.percentualNaoCumprido).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor devido no mês</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(medicao.valorDevidoMes)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor glosado no mês</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(medicao.valorGlosadoMes)}
              </p>
            </div>
            {medicao.valorTotalConsolidadoMes != null && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Valor consolidado no mês</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(medicao.valorTotalConsolidadoMes)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Checklist proporcional + UST + faturamento variável do datacenter (consumo × preço
                  unitário).
                </p>
              </div>
            )}
          </CardContent>
          {isDatacenter && medicao && (
            <CardContent className="pt-0 border-t space-y-4">
              <div>
                <p className="text-sm font-medium">Datacenter — quantidade usada no mês</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Informe o uso de cada linha para calcular o faturamento variável (quantidade × R$
                  unitário do contrato). O valor entra no consolidado acima após salvar ou recalcular.
                </p>
              </div>
              {!itensDcOrdenados.length && !(medicao.consumoDatacenterLicencas?.length ?? 0) ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma linha de consumo ainda. Use <strong>Gerar/Atualizar</strong> para criar esta
                  competência; o sistema alinhará com os itens e licenças cadastrados no contrato.
                </p>
              ) : (
                <>
                  {itensDcOrdenados.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Itens do edital</p>
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50 text-left">
                              <th className="p-2">Linha</th>
                              <th className="p-2">Qtd. máx.</th>
                              <th className="p-2">R$ unit.</th>
                              <th className="p-2 w-[120px]">Usada no mês</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensDcOrdenados.map((row) => {
                              const qmax = row.itemPrevisto.quantidadeContratada;
                              const vu = row.itemPrevisto.valorUnitarioMensal;
                              return (
                                <tr key={row.itemPrevistoId} className="border-b border-border/60">
                                  <td className="p-2 align-top">
                                    {LABEL_TIPO_RECURSO_DATACENTER[row.itemPrevisto.tipo]}
                                  </td>
                                  <td className="p-2 align-top">
                                    {qmax != null ? Number(qmax).toLocaleString("pt-BR") : "—"}
                                  </td>
                                  <td className="p-2 align-top">
                                    {vu != null ? formatCurrency(vu) : "—"}
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      className="h-8 text-xs"
                                      type="text"
                                      inputMode="decimal"
                                      disabled={!medicaoAberta || !podeEditar}
                                      value={qtdItensDc[row.itemPrevistoId] ?? ""}
                                      onChange={(e) =>
                                        setQtdItensDc((prev) => ({
                                          ...prev,
                                          [row.itemPrevistoId]: e.target.value,
                                        }))
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {(medicao.consumoDatacenterLicencas?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Licenças adicionais</p>
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50 text-left">
                              <th className="p-2">Nome</th>
                              <th className="p-2">Qtd. máx.</th>
                              <th className="p-2">R$ unit.</th>
                              <th className="p-2 w-[120px]">Usada no mês</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(medicao.consumoDatacenterLicencas ?? []).map((row) => {
                              const qmax = row.licenca.quantidadeMaxima;
                              const vu = row.licenca.valorUnitarioMensal;
                              return (
                                <tr key={row.licencaId} className="border-b border-border/60">
                                  <td className="p-2">{row.licenca.nome}</td>
                                  <td className="p-2">
                                    {qmax != null ? Number(qmax).toLocaleString("pt-BR") : "—"}
                                  </td>
                                  <td className="p-2">{vu != null ? formatCurrency(vu) : "—"}</td>
                                  <td className="p-2">
                                    <Input
                                      className="h-8 text-xs"
                                      type="text"
                                      inputMode="decimal"
                                      disabled={!medicaoAberta || !podeEditar}
                                      value={qtdLicDc[row.licencaId] ?? ""}
                                      onChange={(e) =>
                                        setQtdLicDc((prev) => ({
                                          ...prev,
                                          [row.licencaId]: e.target.value,
                                        }))
                                      }
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm">
                      Faturamento datacenter (estimado com os valores digitados):{" "}
                      <strong>{formatCurrency(String(previewFaturamentoDc))}</strong>
                    </p>
                    {podeEditar && medicaoAberta && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={salvarConsumoDatacenter}
                        disabled={salvandoDc}
                      >
                        {salvandoDc ? "Salvando..." : "Salvar consumo datacenter"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}
          <CardContent className="pt-0 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <strong>{STATUS_LABEL[medicao.statusFechamento] ?? medicao.statusFechamento}</strong>
            </p>
            {podeEditar && medicaoAberta && (
              <Button size="sm" variant="secondary" onClick={() => setDialogFechar(true)}>
                Fechar competência
              </Button>
            )}
            {podeEditar && !medicaoAberta && (
              <Button size="sm" variant="outline" onClick={() => setDialogReabrir(true)}>
                Reabrir competência
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogFechar} onOpenChange={setDialogFechar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar competência</DialogTitle>
            <DialogDescription>
              Após fechar, alterações no checklist desta competência devem seguir o processo da sua
              governança. Confirme os itens abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={chkPerc}
                onChange={(e) => setChkPerc(e.target.checked)}
              />
              <span>Revisei percentuais e valores devido/glosado desta medição.</span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={chkUst}
                onChange={(e) => setChkUst(e.target.checked)}
              />
              <span>UST do mês está conferida (execução técnica / lançamentos).</span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={chkBloqueio}
                onChange={(e) => setChkBloqueio(e.target.checked)}
              />
              <span>Entendo que fechar registra data e usuário e formaliza o fechamento desta competência.</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={recalcularDentroDialog}
              disabled={gerando || !medicao?.id}
            >
              Recalcular agora (checklist + UST)
            </Button>
          </div>
          {erroApi && <p className="text-sm text-destructive">{erroApi}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogFechar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarFechar}
              disabled={!chkPerc || !chkUst || !chkBloqueio || gerando}
            >
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogReabrir} onOpenChange={setDialogReabrir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir competência</DialogTitle>
            <DialogDescription>
              A competência voltará ao status <strong>Aberta</strong>. Use apenas quando precisar corrigir
              dados antes de um novo fechamento.
            </DialogDescription>
          </DialogHeader>
          {erroApi && <p className="text-sm text-destructive">{erroApi}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogReabrir(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarReabrir} disabled={gerando}>
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
