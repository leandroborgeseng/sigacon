"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Layers,
  ListChecks,
  AlertCircle,
  Calculator,
  BookOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/modulos", label: "Módulos", icon: Layers },
  { href: "/itens", label: "Itens Contratuais", icon: ListChecks },
  { href: "/pendencias", label: "Pendências", icon: AlertCircle },
  { href: "/medicoes", label: "Medição Mensal", icon: Calculator },
  { href: "/atas", label: "Atas de Reunião", icon: BookOpen },
  { href: "/importacao", label: "Importação XLSX", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <FileText className="h-6 w-6 text-primary" />
          <span>SIGACON</span>
        </Link>
      </div>
      <p className="px-4 py-2 text-xs text-muted-foreground">
        Sistema de Gestão e Acompanhamento Contratual
      </p>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
