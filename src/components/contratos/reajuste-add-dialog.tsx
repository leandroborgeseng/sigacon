"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { reajusteContratoSchema, type ReajusteContratoInput } from "@/lib/validators/contrato";
import { Plus } from "lucide-react";

export function ReajusteAddDialog({
  contratoId,
  valorAtual,
  children,
}: {
  contratoId: string;
  valorAtual: number;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ReajusteContratoInput>({
    resolver: zodResolver(reajusteContratoSchema),
    defaultValues: {
      dataReajuste: new Date(),
      valorAnterior: valorAtual,
      valorNovo: valorAtual,
      percentualAplicado: 0,
      indiceReferencia: "",
      observacao: "",
    },
  });

  async function onSubmit(data: ReajusteContratoInput) {
    const res = await fetch(`/api/contratos/${contratoId}/reajustes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        indiceReferencia: data.indiceReferencia || undefined,
        observacao: data.observacao || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.message ?? "Erro ao registrar reajuste" });
      return;
    }
    setOpen(false);
    form.reset({ ...form.getValues(), valorAnterior: data.valorNovo, valorNovo: data.valorNovo });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar reajuste
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar reajuste</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <div className="space-y-2">
            <Label>Data do reajuste</Label>
            <Input
              type="date"
              {...form.register("dataReajuste", { setValueAs: (v: string) => new Date(v) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor anterior (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("valorAnterior", { valueAsNumber: true })}
              />
              {form.formState.errors.valorAnterior && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.valorAnterior.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valor novo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("valorNovo", { valueAsNumber: true })}
              />
              {form.formState.errors.valorNovo && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.valorNovo.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Percentual aplicado (%)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("percentualAplicado", { valueAsNumber: true })}
              />
              {form.formState.errors.percentualAplicado && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.percentualAplicado.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Índice de referência (opcional)</Label>
              <Input {...form.register("indiceReferencia")} placeholder="Ex: IPCA" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input {...form.register("observacao")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
