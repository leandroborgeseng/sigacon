"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type Contrato = { id: string; nome: string };

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
  const [medicao, setMedicao] = useState<{
    id: string;
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
    statusFechamento: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [dialogFechar, setDialogFechar] = useState(false);
  const [dialogReabrir, setDialogReabrir] = useState(false);
  const [chkPerc, setChkPerc] = useState(false);
  const [chkUst, setChkUst] = useState(false);
  const [chkBloqueio, setChkBloqueio] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

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
      .then((data) => {
        if (data && data.id) {
          setMedicao({
            id: data.id,
            totalItensValidos: data.totalItensValidos,
            totalItensAtendidos: data.totalItensAtendidos,
            totalItensParciais: data.totalItensParciais,
            totalItensNaoAtendidos: data.totalItensNaoAtendidos,
            percentualCumprido: String(data.percentualCumprido),
            percentualNaoCumprido: String(data.percentualNaoCumprido),
            valorAnualContrato: String(data.valorAnualContrato),
            valorMensalReferencia: String(data.valorMensalReferencia),
            valorDevidoMes: String(data.valorDevidoMes),
            valorGlosadoMes: String(data.valorGlosadoMes),
            statusFechamento: data.statusFechamento,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contratoId, ano, mes]);

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
        setErroApi(data.message ?? "Erro ao gerar medição");
        return;
      }
      if (res.ok && data.id) {
        setMedicao({
          id: data.id,
          totalItensValidos: data.totalItensValidos,
          totalItensAtendidos: data.totalItensAtendidos,
          totalItensParciais: data.totalItensParciais,
          totalItensNaoAtendidos: data.totalItensNaoAtendidos,
          percentualCumprido: String(data.percentualCumprido),
          percentualNaoCumprido: String(data.percentualNaoCumprido),
          valorAnualContrato: String(data.valorAnualContrato),
          valorMensalReferencia: String(data.valorMensalReferencia),
          valorDevidoMes: String(data.valorDevidoMes),
          valorGlosadoMes: String(data.valorGlosadoMes),
          statusFechamento: data.statusFechamento,
        });
        router.refresh();
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
        setErroApi(data.message ?? "Erro ao recalcular");
        return;
      }
      setMedicao((prev) =>
        prev
          ? {
              ...prev,
              totalItensValidos: data.totalItensValidos,
              totalItensAtendidos: data.totalItensAtendidos,
              totalItensParciais: data.totalItensParciais,
              totalItensNaoAtendidos: data.totalItensNaoAtendidos,
              percentualCumprido: String(data.percentualCumprido),
              percentualNaoCumprido: String(data.percentualNaoCumprido),
              valorDevidoMes: String(data.valorDevidoMes),
              valorGlosadoMes: String(data.valorGlosadoMes),
            }
          : null
      );
      router.refresh();
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
        setErroApi(data.message ?? "Erro ao fechar");
        return;
      }
      setMedicao((prev) => (prev ? { ...prev, statusFechamento: data.statusFechamento } : null));
      setDialogFechar(false);
      setChkPerc(false);
      setChkUst(false);
      setChkBloqueio(false);
      router.refresh();
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
        setErroApi(data.message ?? "Erro ao reabrir");
        return;
      }
      setMedicao((prev) => (prev ? { ...prev, statusFechamento: data.statusFechamento } : null));
      setDialogReabrir(false);
      router.refresh();
    } finally {
      setGerando(false);
    }
  }

  const medicaoAberta = medicao?.statusFechamento === "ABERTA";

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

      {loading && <p className="text-muted-foreground">Carregando...</p>}

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
          </CardContent>
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
