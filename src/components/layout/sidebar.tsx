"use client";

import Link from "next/link";
import { useMemo } from "react";
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
  Users,
  Shield,
  Gauge,
  BookMarked,
  LayoutGrid,
  Printer,
  KanbanSquare,
  Settings,
  Target,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_BRAND } from "@/lib/branding";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SessionUser = { perfil: string } | null;

type NavItem = {
  href: string;
  label: string;
  icon: typeof FileText;
  adminOnly?: boolean;
  relatorioExecutivo?: boolean;
  integracaoGlpi?: boolean;
  configuracaoGlpi?: boolean;
};

const NAV: Record<string, NavItem> = {
  dashboard: { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  metas: { href: "/metas", label: "Metas", icon: Target },
  projetos: { href: "/projetos", label: "Projetos", icon: FolderKanban },
  contratos: { href: "/contratos", label: "Contratos", icon: FileText },
  modulos: { href: "/modulos", label: "Módulos", icon: Layers },
  itens: { href: "/itens", label: "Itens contratuais", icon: ListChecks },
  pendencias: { href: "/pendencias", label: "Pendências", icon: AlertCircle },
  medicoes: { href: "/medicoes", label: "Medição mensal", icon: Calculator },
  atas: { href: "/atas", label: "Atas de reunião", icon: BookOpen },
  execucao: { href: "/execucao-tecnica", label: "UST & catálogo", icon: Gauge },
  importacao: { href: "/importacao", label: "Importação XLSX", icon: Upload },
  manual: { href: "/manual", label: "Manual do sistema", icon: BookMarked },
  configGlpi: {
    href: "/configuracao/glpi",
    label: "Configuração do sistema de chamados",
    icon: Settings,
    configuracaoGlpi: true,
  },
  kanbanGlpi: {
    href: "/integracao/glpi",
    label: "Kanban",
    icon: KanbanSquare,
    integracaoGlpi: true,
  },
  relExec: {
    href: "/relatorios/executivo-impressao",
    label: "Relatório executivo",
    icon: Printer,
    relatorioExecutivo: true,
  },
  usuarios: { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  perfis: { href: "/usuarios/perfis", label: "Perfis e permissões", icon: Shield, adminOnly: true },
};

const GROUP_DEF: { id: string; label: string; keys: (keyof typeof NAV)[] }[] = [
  { id: "principal", label: "Visão geral", keys: ["dashboard", "kanbanGlpi", "metas", "projetos"] },
  {
    id: "contratos",
    label: "Contratos e entregas",
    keys: ["contratos", "modulos", "itens", "pendencias", "medicoes", "atas", "execucao"],
  },
  { id: "apoio", label: "Dados e apoio", keys: ["importacao", "manual"] },
  {
    id: "integracao",
    label: "Integrações e relatórios",
    keys: ["configGlpi", "relExec"],
  },
  { id: "admin", label: "Administração", keys: ["usuarios", "perfis"] },
];

function itemVisible(
  item: NavItem,
  ctx: {
    isAdmin: boolean;
    podeRelatorioExecutivo: boolean;
    podeIntegracaoGlpi: boolean;
    podeConfiguracaoGlpi: boolean;
  }
): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false;
  if (item.relatorioExecutivo && !ctx.podeRelatorioExecutivo) return false;
  if (item.integracaoGlpi && !ctx.podeIntegracaoGlpi) return false;
  if (item.configuracaoGlpi && !ctx.podeConfiguracaoGlpi) return false;
  return true;
}

export function Sidebar({
  user,
  podeRelatorioExecutivo = false,
  podeIntegracaoGlpi = false,
  podeConfiguracaoGlpi = false,
  onNavigate,
}: {
  user?: SessionUser;
  podeRelatorioExecutivo?: boolean;
  podeIntegracaoGlpi?: boolean;
  podeConfiguracaoGlpi?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = user?.perfil === "ADMIN";

  const ctx = {
    isAdmin,
    podeRelatorioExecutivo,
    podeIntegracaoGlpi,
    podeConfiguracaoGlpi,
  };

  const groups = useMemo(() => {
    return GROUP_DEF.map((g) => ({
      id: g.id,
      label: g.label,
      items: g.keys.map((k) => NAV[k]).filter((item) => itemVisible(item, ctx)),
    })).filter((g) => g.items.length > 0);
  }, [isAdmin, podeRelatorioExecutivo, podeIntegracaoGlpi, podeConfiguracaoGlpi]);

  const defaultOpen = useMemo(() => groups.map((g) => g.id), [groups]);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 shrink-0 items-center border-b bg-gradient-to-r from-primary/5 to-transparent px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md font-semibold tracking-tight touch-manipulation outline-none ring-offset-background transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onNavigate}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <span>{APP_BRAND.name}</span>
        </Link>
      </div>
      <p className="shrink-0 px-4 py-2 text-xs text-muted-foreground leading-snug">
        {APP_BRAND.tagline}
      </p>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full space-y-0">
          {groups.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border-none">
              <AccordionTrigger
                className="py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline [&[data-state=open]]:text-foreground"
              >
                {group.label}
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0">
                <div className="flex flex-col gap-0.5 pl-0">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "before:absolute before:left-0 before:top-1/2 before:h-[58%] before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-opacity",
                          isActive
                            ? "bg-primary/12 text-primary before:opacity-100"
                            : "text-muted-foreground before:opacity-0 hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </div>
  );
}
