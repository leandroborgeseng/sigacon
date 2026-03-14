import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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
    include: { contrato: true, anexos: true },
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

      {ata.anexos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anexos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ata.anexos.map((a) => (
                <li key={a.id}>
                  <span>{a.nomeOriginal}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {a.tipoAnexo}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
