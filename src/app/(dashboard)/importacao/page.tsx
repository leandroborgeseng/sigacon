import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TipoContrato } from "@prisma/client";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ImportacaoClient } from "@/components/importacao/importacao-client";
import { ImportacaoContratosClient } from "@/components/importacao/importacao-contratos-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ImportacaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const contratos = await prisma.contrato.findMany({
    where: { tipoContrato: { not: TipoContrato.DATACENTER } },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Importação XLSX" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importação XLSX</h1>
        <p className="text-muted-foreground">
          Importação em massa com formato padrão (apenas contratos de software; datacenter usa o cadastro do contrato).
        </p>
      </div>
      <Tabs defaultValue="itens">
        <TabsList>
          <TabsTrigger value="itens">Itens e avaliações</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>
        <TabsContent value="itens">
          <ImportacaoClient contratos={contratos} />
        </TabsContent>
        <TabsContent value="contratos">
          <ImportacaoContratosClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
