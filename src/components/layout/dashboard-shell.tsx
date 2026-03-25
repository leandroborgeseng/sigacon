"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

export function DashboardShell({
  user,
  podeRelatorioExecutivo,
  podeIntegracaoGlpi,
  podeConfiguracaoGlpi,
  children,
}: {
  user: SessionUser;
  podeRelatorioExecutivo: boolean;
  podeIntegracaoGlpi: boolean;
  podeConfiguracaoGlpi: boolean;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] max-w-[18rem] border-r bg-card shadow-lg transition-transform duration-200 md:static md:z-0 md:w-64 md:max-w-none md:translate-x-0 md:shadow-none",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <Sidebar
          user={user}
          podeRelatorioExecutivo={podeRelatorioExecutivo}
          podeIntegracaoGlpi={podeIntegracaoGlpi}
          podeConfiguracaoGlpi={podeConfiguracaoGlpi}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onOpenMobileMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
