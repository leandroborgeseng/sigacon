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
import { moduloSchema, type ModuloInput } from "@/lib/validators";
import { Plus } from "lucide-react";

type Contrato = { id: string; nome: string };

export function ModuloCreateDialog({ contratos }: { contratos: Contrato[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ModuloInput>({
    resolver: zodResolver(moduloSchema),
    defaultValues: {
      contratoId: "",
      nome: "",
      descricao: "",
      implantado: false,
      ativo: true,
    },
  });

  async function onSubmit(data: ModuloInput) {
    const res = await fetch("/api/modulos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.message ?? "Erro ao criar" });
      return;
    }
    setOpen(false);
    form.reset({ ...form.getValues(), nome: "", descricao: "" });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={contratos.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Novo módulo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo módulo</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={form.watch("contratoId")}
              onValueChange={(v) => form.setValue("contratoId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.contratoId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contratoId.message}
              </p>
            )}
          </div>
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
            <Label>Descrição (opcional)</Label>
            <Textarea {...form.register("descricao")} rows={2} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register("implantado")}
                className="rounded"
              />
              <span className="text-sm">Implantado</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register("ativo")}
                className="rounded"
              />
              <span className="text-sm">Ativo</span>
            </label>
          </div>
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
