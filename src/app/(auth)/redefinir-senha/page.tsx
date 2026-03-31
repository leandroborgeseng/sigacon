"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const formSchema = z
  .object({
    senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmar: z.string().min(8, "Confirme a senha"),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não coincidem",
    path: ["confirmar"],
  });

type FormValues = z.infer<typeof formSchema>;

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { senha: "", confirmar: "" },
  });

  async function onSubmit(data: FormValues) {
    setErro(null);
    setOk(null);
    if (token.length < 32) {
      setErro("Link inválido ou incompleto.");
      return;
    }
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha: data.senha }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setErro(json.message ?? "Não foi possível redefinir a senha.");
      return;
    }
    setOk(json.message ?? "Senha alterada.");
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <Card className="w-full border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            Abra o link completo enviado por e-mail ou solicite um novo em Esqueci minha senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/esqueci-senha">Solicitar novo link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-border/80 shadow-lg shadow-primary/5 ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl tracking-tight">Nova senha</CardTitle>
        <CardDescription>Defina uma senha forte (mínimo 8 caracteres).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {erro && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
          )}
          {ok && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100">
              {ok} Redirecionando para o login…
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              className="touch-manipulation"
              {...register("senha")}
            />
            {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              className="touch-manipulation"
              {...register("confirmar")}
            />
            {errors.confirmar && (
              <p className="text-sm text-destructive">{errors.confirmar.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full min-h-11 touch-manipulation" disabled={isSubmitting || !!ok}>
            {isSubmitting ? "Salvando…" : "Salvar nova senha"}
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Carregando…</p>}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
