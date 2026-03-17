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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usuarioCreateSchema, type UsuarioCreateInput } from "@/lib/validators";
import { PerfilUsuario } from "@prisma/client";
import { Plus } from "lucide-react";
import { PERFIL_LABELS } from "@/lib/permissions";

export function UsuarioCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<UsuarioCreateInput>({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      perfil: PerfilUsuario.LEITOR,
      ativo: true,
    },
  });

  async function onSubmit(data: UsuarioCreateInput) {
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      form.setError("root", { message: json.message ?? "Erro ao criar usuário" });
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
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
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" {...form.register("senha")} placeholder="Mínimo 6 caracteres" />
            {form.formState.errors.senha && (
              <p className="text-xs text-destructive">{form.formState.errors.senha.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select
              value={form.watch("perfil")}
              onValueChange={(v) => form.setValue("perfil", v as PerfilUsuario)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PerfilUsuario).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PERFIL_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              {...form.register("ativo")}
              className="rounded border-input"
            />
            <Label htmlFor="ativo">Ativo</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
