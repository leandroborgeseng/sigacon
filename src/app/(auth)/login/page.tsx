"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators";
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
import Link from "next/link";
import { FileText } from "lucide-react";
import { APP_BRAND, LS_REMEMBER_EMAIL, LS_SAVED_EMAIL } from "@/lib/branding";

const LS_REMEMBER = LS_REMEMBER_EMAIL;
const LS_EMAIL = LS_SAVED_EMAIL;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  useEffect(() => {
    try {
      const remember = localStorage.getItem(LS_REMEMBER) === "1";
      const saved = localStorage.getItem(LS_EMAIL);
      if (remember && saved) {
        setValue("email", saved);
        setRememberEmail(true);
      }
    } catch {
      /* modo privado / storage indisponível */
    }
  }, [setValue]);

  async function onSubmit(data: LoginInput) {
    setError(null);
    try {
      if (rememberEmail) {
        localStorage.setItem(LS_REMEMBER, "1");
        localStorage.setItem(LS_EMAIL, data.email.trim());
      } else {
        localStorage.removeItem(LS_REMEMBER);
        localStorage.removeItem(LS_EMAIL);
      }
    } catch {
      /* ignora */
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "Credenciais inválidas.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full border-border/80 shadow-lg shadow-primary/5 ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <FileText className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <CardTitle className="text-2xl tracking-tight">{APP_BRAND.name}</CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">{APP_BRAND.tagline}</span>
          <span className="block text-xs font-normal normal-case text-muted-foreground">
            {APP_BRAND.acronym}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="seu@email.local"
              className="touch-manipulation"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              className="touch-manipulation"
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-sm text-destructive">{errors.senha.message}</p>
            )}
            <p className="text-right">
              <Link
                href="/esqueci-senha"
                className="text-sm text-primary underline-offset-4 hover:underline touch-manipulation"
              >
                Esqueci minha senha
              </Link>
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground touch-manipulation">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Lembrar meu e-mail neste aparelho
          </label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A senha não é guardada pelo sistema: use o gerenciador de senhas do navegador ou do telefone para preencher
            com segurança após o primeiro acesso.
          </p>
          <Button type="submit" className="w-full min-h-11 touch-manipulation" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
