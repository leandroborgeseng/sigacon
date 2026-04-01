"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { itemContratualCreateSchema, type ItemContratualCreateInput } from "@/lib/validators/item";
import { Plus } from "lucide-react";
import { StatusItem, Criticidade } from "@prisma/client";
import { toast } from "@/hooks/use-toast";

type Contrato = { id: string; nome: string };
type Modulo = { id: string; nome: string; contratoId: string };

const STATUS_LABELS: Record<StatusItem, string> = {
  [StatusItem.ATENDE]: "Atende",
  [StatusItem.PARCIAL]: "Parcial",
  [StatusItem.NAO_ATENDE]: "Não atende",
  [StatusItem.INCONCLUSIVO]: "Inconclusivo",
  [StatusItem.DESCONSIDERADO]: "Desconsiderado",
  [StatusItem.NAO_SE_APLICA]: "Não se aplica",
  [StatusItem.CABECALHO]: "Cabeçalho (estrutural)",
};

type Props = {
  contratos: Contrato[];
  modulos: Modulo[];
  podeEditar: boolean;
  /** Quando definido, o contrato não pode ser trocado (ex.: página do contrato). */
  contratoIdFixo?: string;
  /** Quando definido, o módulo não pode ser trocado (ex.: página do módulo). */
  moduloIdFixo?: string;
  trigger?: ReactNode;
};

export function ItemContratualCreateDialog({
  contratos,
  modulos,
  podeEditar,
  contratoIdFixo,
  moduloIdFixo,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ItemContratualCreateInput>({
    resolver: zodResolver(itemContratualCreateSchema),
    defaultValues: {
      contratoId: contratoIdFixo ?? (moduloIdFixo ? modulos.find((m) => m.id === moduloIdFixo)?.contratoId ?? "" : ""),
      moduloId: moduloIdFixo ?? "",
      lote: "",
      numeroItem: 1,
      descricao: "",
      statusAtual: StatusItem.INCONCLUSIVO,
      observacaoAtual: "",
      criticidade: Criticidade.MEDIA,
      exigeEvidencia: false,
      requisitoLegal: false,
      impactaOperacao: false,
      cabecalhoLogico: false,
      considerarNaMedicao: true,
    },
  });

  const watchContrato = form.watch("contratoId");
  const watchModulo = form.watch("moduloId");

  const modulosFiltrados = useMemo(() => {
    if (!watchContrato) return [];
    return modulos.filter((m) => m.contratoId === watchContrato);
  }, [modulos, watchContrato]);

  useEffect(() => {
    if (!open) return;
    const contratoInicial =
      contratoIdFixo ??
      (moduloIdFixo ? modulos.find((m) => m.id === moduloIdFixo)?.contratoId ?? "" : "");
    form.reset({
      contratoId: contratoInicial,
      moduloId: moduloIdFixo ?? "",
      lote: "",
      numeroItem: 1,
      descricao: "",
      statusAtual: StatusItem.INCONCLUSIVO,
      observacaoAtual: "",
      criticidade: Criticidade.MEDIA,
      exigeEvidencia: false,
      requisitoLegal: false,
      impactaOperacao: false,
      cabecalhoLogico: false,
      considerarNaMedicao: true,
    });
  }, [open, contratoIdFixo, moduloIdFixo, modulos, form]);

  useEffect(() => {
    if (!open || !watchModulo) return;
    let cancelled = false;
    fetch(`/api/itens?moduloId=${encodeURIComponent(watchModulo)}&page=1&pageSize=500`)
      .then((r) => r.json())
      .then((j: { itens?: { numeroItem: number }[] }) => {
        if (cancelled || !Array.isArray(j?.itens)) return;
        const max = j.itens.reduce((a, it) => Math.max(a, it.numeroItem), 0);
        form.setValue("numeroItem", max + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, watchModulo, moduloIdFixo, form]);

  useEffect(() => {
    if (!watchContrato || moduloIdFixo) return;
    const ok = modulosFiltrados.some((m) => m.id === watchModulo);
    if (!ok) {
      form.setValue("moduloId", modulosFiltrados[0]?.id ?? "");
    }
  }, [watchContrato, modulosFiltrados, watchModulo, moduloIdFixo, form]);

  useEffect(() => {
    if (contratoIdFixo) form.setValue("contratoId", contratoIdFixo);
  }, [contratoIdFixo, form]);

  useEffect(() => {
    if (moduloIdFixo) form.setValue("moduloId", moduloIdFixo);
  }, [moduloIdFixo, form]);

  async function onSubmit(values: ItemContratualCreateInput) {
    const res = await fetch("/api/itens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const errJson = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (errJson as { message?: string }).message ?? "Erro ao criar item";
      form.setError("root", { message: msg });
      toast({ variant: "destructive", title: "Não foi possível criar o item", description: msg });
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
    toast({ variant: "success", title: "Item cadastrado" });
  }

  const modulosDoContratoSelecionado = useMemo(() => {
    const cid = contratoIdFixo ?? watchContrato;
    if (!cid) return modulos;
    return modulos.filter((m) => m.contratoId === cid);
  }, [contratoIdFixo, watchContrato, modulos]);

  if (!podeEditar) return null;

  const semModuloDisponivel =
    contratos.length === 0 || (Boolean(contratoIdFixo || watchContrato) && modulosDoContratoSelecionado.length === 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" disabled={semModuloDisponivel} title={semModuloDisponivel ? "Cadastre um módulo no contrato antes de incluir itens" : undefined}>
            <Plus className="mr-2 h-4 w-4" />
            Novo item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showClose>
        <DialogHeader>
          <DialogTitle>Novo item contratual</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <div className="space-y-1">
            <Label>Contrato</Label>
            {contratoIdFixo ? (
              <p className="text-sm text-muted-foreground py-2">
                {contratos.find((c) => c.id === contratoIdFixo)?.nome ?? contratoIdFixo}
              </p>
            ) : (
              <Select
                value={watchContrato || "__nenhum__"}
                onValueChange={(v) => form.setValue("contratoId", v === "__nenhum__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            )}
          </div>
          <div className="space-y-1">
            <Label>Módulo</Label>
            {moduloIdFixo ? (
              <p className="text-sm text-muted-foreground py-2">
                {modulos.find((m) => m.id === moduloIdFixo)?.nome ?? moduloIdFixo}
              </p>
            ) : (
              <Select
                value={watchModulo || "__nenhum__"}
                onValueChange={(v) => form.setValue("moduloId", v === "__nenhum__" ? "" : v)}
                disabled={!watchContrato || modulosFiltrados.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={watchContrato ? "Módulo" : "Escolha o contrato primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Selecione o módulo</SelectItem>
                  {modulosFiltrados.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="item-numero">Nº do item</Label>
              <Input
                id="item-numero"
                type="number"
                min={1}
                {...form.register("numeroItem", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-lote">Lote (opcional)</Label>
              <Input id="item-lote" {...form.register("lote")} placeholder="—" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-desc">Descrição</Label>
            <Textarea id="item-desc" rows={4} {...form.register("descricao")} placeholder="Texto do item" />
          </div>
          <div className="space-y-1">
            <Label>Status inicial</Label>
            <Select
              value={form.watch("statusAtual")}
              onValueChange={(v) => form.setValue("statusAtual", v as StatusItem)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(StatusItem).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-obs">Observação (opcional)</Label>
            <Textarea id="item-obs" rows={2} {...form.register("observacaoAtual")} />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...form.register("considerarNaMedicao")} />
              Considerar na medição
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...form.register("cabecalhoLogico")} />
              Cabeçalho lógico
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : "Cadastrar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
