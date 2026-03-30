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
import { StatusContrato, LeiLicitacao, TipoContrato } from "@prisma/client";
import { Plus } from "lucide-react";
import { ContratoGlpiGruposField } from "@/components/contratos/contrato-glpi-grupos-field";
import {
  ContratoDatacenterFields,
  defaultDatacenterFormState,
  payloadFromDatacenterForm,
  type DatacenterFormState,
} from "@/components/contratos/contrato-datacenter-fields";

export function ContratoCreateDialog({ podeCriar = true }: { podeCriar?: boolean }) {
  if (!podeCriar) return null;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [glpiGrupos, setGlpiGrupos] = useState<{ glpiGroupId: number; nome: string }[]>([]);
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>(TipoContrato.SOFTWARE);
  const [dcForm, setDcForm] = useState<DatacenterFormState>(() => defaultDatacenterFormState());

  const form = useForm<ContratoInput>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      nome: "",
      numeroContrato: "",
      fornecedor: "",
      objeto: "",
      vigenciaInicio: new Date(),
      vigenciaFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      valorAnual: 0,
      status: StatusContrato.ATIVO,
      leiLicitacao: LeiLicitacao.LEI_8666,
      dataAssinatura: undefined,
      numeroRenovacoes: 0,
    },
  });

  async function onSubmit(data: ContratoInput) {
    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        tipoContrato,
        ...(tipoContrato === TipoContrato.DATACENTER
          ? { datacenter: payloadFromDatacenterForm(dcForm) }
          : {}),
        glpiGruposTecnicos: glpiGrupos.map((g) => ({
          glpiGroupId: g.glpiGroupId,
          nome: g.nome,
        })),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.message ?? "Erro ao criar" });
      return;
    }
    setOpen(false);
    form.reset();
    setGlpiGrupos([]);
    setTipoContrato(TipoContrato.SOFTWARE);
    setDcForm(defaultDatacenterFormState());
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo contrato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
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
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Número do contrato</Label>
              <Input {...form.register("numeroContrato")} />
              {form.formState.errors.numeroContrato && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.numeroContrato.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Input {...form.register("fornecedor")} />
            {form.formState.errors.fornecedor && (
              <p className="text-xs text-destructive">
                {form.formState.errors.fornecedor.message}
              </p>
            )}
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
          <div className="space-y-2">
            <Label>Tipo de contrato</Label>
            <Select
              value={tipoContrato}
              onValueChange={(v) => setTipoContrato(v as TipoContrato)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoContrato.SOFTWARE}>Software (medição / itens / UST)</SelectItem>
                <SelectItem value={TipoContrato.DATACENTER}>Datacenter (infraestrutura)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Contratos de datacenter registram vCPU, RAM, discos, rack (U) e links metropolitanos.
            </p>
          </div>
          {tipoContrato === TipoContrato.DATACENTER && (
            <ContratoDatacenterFields value={dcForm} onChange={setDcForm} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("valorAnual", { valueAsNumber: true })}
              />
              {form.formState.errors.valorAnual && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.valorAnual.message}
                </p>
              )}
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
                {...form.register("dataAssinatura", { setValueAs: (v) => (v ? new Date(v) : undefined) })}
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
            {form.formState.errors.numeroRenovacoes && (
              <p className="text-xs text-destructive">
                {form.formState.errors.numeroRenovacoes.message}
              </p>
            )}
          </div>
          <ContratoGlpiGruposField value={glpiGrupos} onChange={setGlpiGrupos} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
