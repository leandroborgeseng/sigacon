"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookMarked, LogOut, Menu } from "lucide-react";
import type { SessionUser } from "@/lib/session";

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
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 pt-[env(safe-area-inset-top)] md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
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
        <span className="truncate text-sm text-muted-foreground">
          {user ? `${user?.nome ?? ""} (${user?.perfil ?? ""})` : ""}
        </span>
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
