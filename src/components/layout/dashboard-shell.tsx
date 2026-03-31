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
    <div className="relative flex h-[100dvh] overflow-hidden bg-background">
      <a
        href="#conteudo-principal"
        className="fixed left-4 top-2 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-0 shadow-lg transition focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Ir para o conteúdo principal
      </a>
      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
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
        <main
          id="conteudo-principal"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
