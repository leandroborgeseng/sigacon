"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators";
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

export default function EsqueciSenhaPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setErro(null);
    setMsg(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email.trim() }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setErro(json.message ?? "Não foi possível enviar o e-mail.");
      return;
    }
    setMsg(json.message ?? "Verifique sua caixa de entrada.");
  }

  return (
    <Card className="w-full border-border/80 shadow-lg shadow-primary/5 ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl tracking-tight">Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta. Se ela existir e estiver ativa, enviaremos um link para redefinir a senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {erro && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
          )}
          {msg && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100">
              {msg}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="touch-manipulation"
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full min-h-11 touch-manipulation" disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Enviar link"}
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
