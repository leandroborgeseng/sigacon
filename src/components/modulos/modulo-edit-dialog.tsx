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
  DialogFooter,
} from "@/components/ui/dialog";
import { moduloSchema, type ModuloInput } from "@/lib/validators";
import { Pencil } from "lucide-react";

type Modulo = {
  id: string;
  nome: string;
  descricao: string | null;
  implantado: boolean;
  ativo: boolean;
  contratoId: string;
};

export function ModuloEditDialog({ modulo }: { modulo: Modulo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ModuloInput>({
    resolver: zodResolver(moduloSchema),
    defaultValues: {
      contratoId: modulo.contratoId,
      nome: modulo.nome,
      descricao: modulo.descricao ?? "",
      implantado: modulo.implantado,
      ativo: modulo.ativo,
    },
  });

  async function onSubmit(data: ModuloInput) {
    const res = await fetch(`/api/modulos/${modulo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.message ?? "Erro ao salvar" });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar módulo</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
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
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
