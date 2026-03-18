"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookMarked, LogOut } from "lucide-react";
import type { SessionUser } from "@/lib/session";

interface HeaderProps {
  user: SessionUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
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
