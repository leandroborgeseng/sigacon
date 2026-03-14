import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ItemDetailTabs } from "@/components/itens/item-detail-tabs";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const item = await prisma.itemContratual.findUnique({
    where: { id },
    include: {
      modulo: true,
      contrato: true,
      avaliacoes: {
        orderBy: { criadoEm: "desc" },
        take: 100,
        include: { usuario: { select: { nome: true } } },
      },
      pendencias: true,
      anexos: true,
    },
  });

  if (!item) notFound();

  const historico = await prisma.historicoAuditoria.findMany({
    where: { entidade: "ItemContratual", entidadeId: id },
    orderBy: { criadoEm: "desc" },
    take: 50,
    include: { usuario: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Itens", href: "/itens" },
          { label: `Item ${item.numeroItem}` },
        ]}
      />
      <ItemDetailTabs
        item={JSON.parse(JSON.stringify(item))}
        historico={JSON.parse(JSON.stringify(historico))}
      />
    </div>
  );
}
