import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const itens: {
  id: "contratos" | "metas" | "projetos";
  href: string;
  label: string;
  title: string;
}[] = [
  { id: "contratos", href: "/contratos", label: "Contratos", title: "Gestão de contratos" },
  { id: "metas", href: "/metas", label: "Metas", title: "Gestão de metas" },
  { id: "projetos", href: "/projetos", label: "Projetos", title: "Gestão de projetos" },
];

export function GestaoSwitcher({ atual }: { atual: "contratos" | "metas" | "projetos" }) {
  return (
    <nav
      aria-label="Alternar entre gestão de contratos, metas e projetos"
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border bg-muted/40 p-1 shadow-sm"
    >
      {itens.map((item) => {
        const ativo = atual === item.id;
        return (
          <Button
            key={item.id}
            variant={ativo ? "default" : "ghost"}
            size="sm"
            className={cn(
              "touch-manipulation rounded-lg shadow-none",
              !ativo && "text-muted-foreground hover:bg-background/80 hover:text-foreground"
            )}
            asChild
          >
            <Link href={item.href} title={item.title} aria-current={ativo ? "page" : undefined}>
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
