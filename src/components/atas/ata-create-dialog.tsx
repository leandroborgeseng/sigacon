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
import { ataReuniaoSchema, type AtaReuniaoInput } from "@/lib/validators";
import { Plus } from "lucide-react";

type Contrato = { id: string; nome: string };

export function AtaCreateDialog({ contratos }: { contratos: Contrato[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<AtaReuniaoInput>({
    resolver: zodResolver(ataReuniaoSchema),
    defaultValues: {
      contratoId: "",
      titulo: "",
      dataReuniao: new Date(),
      local: "",
      participantes: "",
      resumo: "",
      deliberacoes: "",
    },
  });

  async function onSubmit(data: AtaReuniaoInput) {
    const res = await fetch("/api/atas", {
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
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={contratos.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nova ata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova ata de reunião</DialogTitle>
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
            <Label>Título</Label>
            <Input {...form.register("titulo")} />
            {form.formState.errors.titulo && (
              <p className="text-xs text-destructive">
                {form.formState.errors.titulo.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da reunião</Label>
              <Input
                type="date"
                {...form.register("dataReuniao", { valueAsDate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input {...form.register("local")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Participantes (opcional)</Label>
            <Textarea {...form.register("participantes")} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Resumo (opcional)</Label>
            <Textarea {...form.register("resumo")} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Deliberações (opcional)</Label>
            <Textarea {...form.register("deliberacoes")} rows={3} />
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
