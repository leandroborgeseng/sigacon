import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      modulos: true,
      medicoes: { orderBy: [{ ano: "desc" }, { mes: "desc" }], take: 12 },
      atas: { orderBy: { dataReuniao: "desc" }, take: 5 },
      _count: { select: { itens: true } },
    },
  });

  if (!contrato) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Contratos", href: "/contratos" },
          { label: contrato.nome },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contrato.nome}</h1>
          <p className="text-muted-foreground">
            {contrato.numeroContrato} • {contrato.fornecedor}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/medicoes?contratoId=${id}`}>Medição mensal</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Objeto:</span>{" "}
            {contrato.objeto || "—"}
          </p>
          <p>
            <span className="font-medium">Vigência:</span>{" "}
            {formatDate(contrato.vigenciaInicio)} a{" "}
            {formatDate(contrato.vigenciaFim)}
          </p>
          <p>
            <span className="font-medium">Valor anual:</span>{" "}
            {formatCurrency(contrato.valorAnual)}
          </p>
          <p>
            <span className="font-medium">Valor mensal referência:</span>{" "}
            {formatCurrency(
              contrato.valorMensalReferencia ??
                Number(contrato.valorAnual) / 12
            )}
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <Badge variant="secondary">{contrato.status}</Badge>
          </p>
          {contrato.gestorContrato && (
            <p>
              <span className="font-medium">Gestor:</span>{" "}
              {contrato.gestorContrato}
            </p>
          )}
          <p>
            <span className="font-medium">Total de itens:</span>{" "}
            {contrato._count.itens}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            {contrato.modulos.length === 0 ? (
              <p className="p-4 text-muted-foreground">
                Nenhum módulo cadastrado.
              </p>
            ) : (
              <ul className="divide-y">
                {contrato.modulos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between p-4">
                    <div>
                      <Link
                        href={`/modulos/${m.id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {m.nome}
                      </Link>
                      {m.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {m.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant={m.ativo ? "default" : "secondary"}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas medições</CardTitle>
        </CardHeader>
        <CardContent>
          {contrato.medicoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma medição registrada.</p>
          ) : (
            <ul className="space-y-2">
              {contrato.medicoes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <span>
                    {m.mes}/{m.ano}
                  </span>
                  <span>
                    {Number(m.percentualCumprido).toFixed(2)}% •{" "}
                    {formatCurrency(m.valorDevidoMes)} devido
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas atas</CardTitle>
        </CardHeader>
        <CardContent>
          {contrato.atas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma ata registrada.</p>
          ) : (
            <ul className="space-y-2">
              {contrato.atas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/atas/${a.id}`}
                    className="hover:underline text-primary"
                  >
                    {a.titulo} – {formatDate(a.dataReuniao)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
