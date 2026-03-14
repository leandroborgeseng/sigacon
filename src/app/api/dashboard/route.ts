import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDashboardIndicators, getIndicadoresPorModulo } from "@/server/services/indicators";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const [indicators, porModulo] = await Promise.all([
      getDashboardIndicators(),
      getIndicadoresPorModulo(),
    ]);
    return NextResponse.json({ indicators, porModulo });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json(
      { message: "Erro ao carregar indicadores" },
      { status: 500 }
    );
  }
}
