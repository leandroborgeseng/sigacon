import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GestaoSwitcher({ atual }: { atual: "contratos" | "metas" | "projetos" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={atual === "contratos" ? "default" : "outline"} size="sm" asChild>
        <Link href="/contratos">Gestão de contratos</Link>
      </Button>
      <Button variant={atual === "metas" ? "default" : "outline"} size="sm" asChild>
        <Link href="/metas">Gestão de metas</Link>
      </Button>
      <Button variant={atual === "projetos" ? "default" : "outline"} size="sm" asChild>
        <Link href="/projetos">Gestão de projetos</Link>
      </Button>
    </div>
  );
}
