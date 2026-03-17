"use client";

import { useState, useEffect } from "react";
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
import { usuarioUpdateSchema, type UsuarioUpdateInput } from "@/lib/validators";
import { PerfilUsuario } from "@prisma/client";
import { Pencil } from "lucide-react";
import { PERFIL_LABELS } from "@/lib/permissions";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
};

export function UsuarioEditDialog({ usuario }: { usuario: Usuario }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<UsuarioUpdateInput>({
    resolver: zodResolver(usuarioUpdateSchema),
    defaultValues: {
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      ativo: usuario.ativo,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome: usuario.nome,
        email: usuario.email,
        senha: "",
        perfil: usuario.perfil,
        ativo: usuario.ativo,
      });
    }
  }, [open, usuario, form]);

  async function onSubmit(data: UsuarioUpdateInput) {
    const body: Record<string, unknown> = {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      ativo: data.ativo,
    };
    if (data.senha && data.senha.trim()) body.senha = data.senha;

    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      form.setError("root", { message: json.message ?? "Erro ao atualizar" });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...form.register("nome")} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Nova senha (deixe em branco para manter)</Label>
            <Input type="password" {...form.register("senha")} placeholder="Mín. 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select
              value={form.watch("perfil") ?? PerfilUsuario.LEITOR}
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
              id="ativo-edit"
              {...form.register("ativo")}
              className="rounded border-input"
            />
            <Label htmlFor="ativo-edit">Ativo</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
