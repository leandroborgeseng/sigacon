"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookMarked, LogOut, Menu } from "lucide-react";
import type { SessionUser } from "@/lib/session";

function iniciaisNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0] ?? ""}${partes[partes.length - 1]![0] ?? ""}`.toUpperCase();
}

interface HeaderProps {
  user: SessionUser | null;
  /** Abre o drawer do menu em viewport mobile. */
  onOpenMobileMenu?: () => void;
}

export function Header({ user, onOpenMobileMenu }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-3 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {onOpenMobileMenu && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 touch-manipulation"
            aria-label="Abrir menu"
            onClick={onOpenMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {user && (
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-2 py-1.5 sm:px-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold uppercase text-primary"
              aria-hidden
            >
              {iniciaisNome(user.nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight text-foreground">
                {user.nome}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.perfil}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manual" title="Manual do sistema — funcionalidades e como usar">
                <BookMarked className="mr-2 h-4 w-4" />
                Manual
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
