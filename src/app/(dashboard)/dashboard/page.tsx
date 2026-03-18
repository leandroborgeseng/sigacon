import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getDashboardIndicators,
  getIndicadoresPorModulo,
  getDashboardAlertas,
} from "@/server/services/indicators";
import { DashboardClient } from "./dashboard-client";

type PageProps = {
  searchParams?: Promise<{ contratoId?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  let contratoId: string | undefined;
  try {
    const sp = searchParams ? await searchParams : {};
    contratoId = (sp as { contratoId?: string }).contratoId;
  } catch {
    contratoId = undefined;
  }

  const contratos = await prisma.contrato.findMany({
    where: { status: "ATIVO" },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  let indicators = null;
  let porModulo: Awaited<ReturnType<typeof getIndicadoresPorModulo>> = [];
  let alertas: Awaited<ReturnType<typeof getDashboardAlertas>> = {
    vencendo90Dias: [],
    ustProximoTeto: [],
  };
  try {
    [indicators, porModulo, alertas] = await Promise.all([
      getDashboardIndicators(contratoId),
      getIndicadoresPorModulo(contratoId),
      getDashboardAlertas(contratoId),
    ]);
  } catch (e) {
    console.error("[dashboard] indicadores:", e);
    try {
      alertas = await getDashboardAlertas(contratoId);
    } catch (e2) {
      console.error("[dashboard] alertas:", e2);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {contratoId
            ? "Indicadores do contrato selecionado"
            : "Visão geral dos contratos e indicadores de acompanhamento"}
        </p>
      </div>
      <DashboardClient
          contratos={contratos}
          contratoId={contratoId}
          indicators={indicators}
          alertas={alertas}
          porModulo={porModulo.map((m) => ({
            nome: m.nome,
            contratoNome: m.contratoNome,
            totalItens: m.totalItens,
            atendidos: m.atendidos,
            percentualAtendimento: m.percentualAtendimento,
            pendenciasAbertas: m.pendenciasAbertas,
          }))}
        />
    </div>
  );
}
