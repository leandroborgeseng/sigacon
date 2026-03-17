import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AtaItensVinculados } from "@/components/atas/ata-itens-vinculados";
import { AtaAnexos } from "@/components/atas/ata-anexos";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AtaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const ata = await prisma.ataReuniao.findUnique({
    where: { id },
    include: {
      contrato: true,
      anexos: true,
      itensVinculados: {
        include: {
          itemContratual: {
            include: { modulo: { select: { nome: true } } },
          },
        },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  if (!ata) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Atas", href: "/atas" },
          { label: ata.titulo },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ata.titulo}</h1>
        <p className="text-muted-foreground">
          {formatDate(ata.dataReuniao)} •{" "}
          <Link href={`/contratos/${ata.contrato.id}`} className="hover:underline">
            {ata.contrato.nome}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da reunião</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Local:</span> {ata.local ?? "—"}</p>
          {ata.participantes && (
            <div>
              <p className="font-medium">Participantes</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{ata.participantes}</p>
            </div>
          )}
          {ata.resumo && (
            <div>
              <p className="font-medium">Resumo</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{ata.resumo}</p>
            </div>
          )}
          {ata.deliberacoes && (
            <div>
              <p className="font-medium">Deliberações</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{ata.deliberacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AtaItensVinculados
        ataId={ata.id}
        contratoId={ata.contratoId}
        itensIniciais={ata.itensVinculados}
      />

      <AtaAnexos ataId={ata.id} anexosIniciais={ata.anexos} />
    </div>
  );
}
