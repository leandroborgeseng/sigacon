import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ManualSistemaContent } from "@/components/manual/manual-sistema";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Manual do sistema | LeX",
  description: "Funcionalidades do LeX e como utilizá-las",
};

export default function ManualPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manual do sistema" },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual do sistema</h1>
          <p className="mt-1 text-muted-foreground max-w-2xl">
            Referência das funcionalidades implementadas no LeX e fluxos principais de uso.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao dashboard
          </Link>
        </Button>
      </div>
      <ManualSistemaContent />
    </div>
  );
}
