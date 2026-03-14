import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardIndicators, getIndicadoresPorModulo } from "@/server/services/indicators";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  let indicators = null;
  let porModulo: Awaited<ReturnType<typeof getIndicadoresPorModulo>> = [];
  try {
    [indicators, porModulo] = await Promise.all([
      getDashboardIndicators(),
      getIndicadoresPorModulo(),
    ]);
  } catch {
    // sem dados ainda
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral dos contratos e indicadores de acompanhamento
        </p>
      </div>
      <DashboardClient
        indicators={indicators}
        porModulo={porModulo.map((m) => ({
          nome: m.nome,
          totalItens: m.totalItens,
          atendidos: m.atendidos,
          percentualAtendimento: m.percentualAtendimento,
          pendenciasAbertas: m.pendenciasAbertas,
        }))}
      />
    </div>
  );
}
