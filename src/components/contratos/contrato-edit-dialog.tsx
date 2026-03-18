"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contratoSchema, type ContratoInput } from "@/lib/validators";
import { StatusContrato, LeiLicitacao } from "@prisma/client";
import { Pencil } from "lucide-react";

type ContratoParaEdicao = {
  id: string;
  nome: string;
  numeroContrato: string;
  fornecedor: string;
  objeto: string | null;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  valorAnual: { toString(): string } | number;
  valorMensalReferencia?: { toString(): string } | number | null;
  status: StatusContrato;
  gestorContrato: string | null;
  observacoesGerais: string | null;
  formaCalculoMedicao: string;
  leiLicitacao: LeiLicitacao;
  dataAssinatura: Date | null;
  numeroRenovacoes: number;
  valorUnitarioUst?: { toString(): string } | number | null;
  limiteUstAno?: { toString(): string } | number | null;
  limiteValorUstAno?: { toString(): string } | number | null;
};

export function ContratoEditDialog({
  contrato,
  children,
}: {
  contrato: ContratoParaEdicao;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<Partial<ContratoInput>>({
    resolver: zodResolver(contratoSchema.partial()),
    defaultValues: {
      nome: contrato.nome,
      numeroContrato: contrato.numeroContrato,
      fornecedor: contrato.fornecedor,
      objeto: contrato.objeto ?? "",
      vigenciaInicio: new Date(contrato.vigenciaInicio),
      vigenciaFim: new Date(contrato.vigenciaFim),
      valorAnual: Number(contrato.valorAnual),
      valorMensalReferencia: contrato.valorMensalReferencia
        ? Number(contrato.valorMensalReferencia)
        : undefined,
      status: contrato.status,
      gestorContrato: contrato.gestorContrato ?? "",
      observacoesGerais: contrato.observacoesGerais ?? "",
      formaCalculoMedicao: contrato.formaCalculoMedicao as ContratoInput["formaCalculoMedicao"],
      leiLicitacao: contrato.leiLicitacao,
      dataAssinatura: contrato.dataAssinatura ? new Date(contrato.dataAssinatura) : undefined,
      numeroRenovacoes: contrato.numeroRenovacoes,
      valorUnitarioUst:
        contrato.valorUnitarioUst != null ? Number(contrato.valorUnitarioUst) : undefined,
      limiteUstAno:
        contrato.limiteUstAno != null ? Number(contrato.limiteUstAno) : undefined,
      limiteValorUstAno:
        contrato.limiteValorUstAno != null ? Number(contrato.limiteValorUstAno) : undefined,
    },
  });

  async function onSubmit(data: Partial<ContratoInput>) {
    const payload: Record<string, unknown> = { ...data };
    if (data.vigenciaInicio) payload.vigenciaInicio = data.vigenciaInicio;
    if (data.vigenciaFim) payload.vigenciaFim = data.vigenciaFim;
    if (data.dataAssinatura !== undefined) payload.dataAssinatura = data.dataAssinatura ?? null;

    const res = await fetch(`/api/contratos/${contrato.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.message ?? "Erro ao atualizar" });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Editar contrato
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input {...form.register("nome")} />
            </div>
            <div className="space-y-2">
              <Label>Número do contrato</Label>
              <Input {...form.register("numeroContrato")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Input {...form.register("fornecedor")} />
          </div>
          <div className="space-y-2">
            <Label>Objeto (opcional)</Label>
            <Textarea {...form.register("objeto")} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vigência início</Label>
              <Input
                type="date"
                {...form.register("vigenciaInicio", { valueAsDate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vigência fim</Label>
              <Input
                type="date"
                {...form.register("vigenciaFim", { valueAsDate: true })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("valorAnual", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status") ?? StatusContrato.ATIVO}
                onValueChange={(v) => form.setValue("status", v as StatusContrato)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(StatusContrato).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gestor do contrato (opcional)</Label>
            <Input {...form.register("gestorContrato")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lei de licitação</Label>
              <Select
                value={form.watch("leiLicitacao") ?? LeiLicitacao.LEI_8666}
                onValueChange={(v) => form.setValue("leiLicitacao", v as LeiLicitacao)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LeiLicitacao.LEI_8666}>Lei 8.666/93 (antiga)</SelectItem>
                  <SelectItem value={LeiLicitacao.LEI_14133}>Lei 14.133/2021 (nova)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de assinatura (opcional)</Label>
              <Input
                type="date"
                {...form.register("dataAssinatura", {
                  setValueAs: (v: string) => (v ? new Date(v) : undefined),
                })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nº de renovações já realizadas</Label>
            <Input
              type="number"
              min={0}
              {...form.register("numeroRenovacoes", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Label>Valor unitário UST (R$)</Label>
            <p className="text-xs text-muted-foreground">
              Referência em reais por UST quando o lançamento não usa preço do catálogo de serviços.
            </p>
            <Input
              type="number"
              step="0.0001"
              min={0}
              placeholder="Ex.: 150,00"
              {...form.register("valorUnitarioUst", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed p-3">
            <div className="space-y-2">
              <Label>Limite UST / ano (opcional)</Label>
              <p className="text-xs text-muted-foreground">Bloqueia lançamentos acima do teto.</p>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...form.register("limiteUstAno", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Limite R$ UST / ano</Label>
              <p className="text-xs text-muted-foreground">Teto financeiro UST no ano.</p>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...form.register("limiteValorUstAno", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
