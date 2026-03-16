import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDashboardIndicators, getIndicadoresPorModulo } from "@/server/services/indicators";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const contratoId = request.nextUrl.searchParams.get("contratoId") ?? undefined;

  try {
    const [indicators, porModulo] = await Promise.all([
      getDashboardIndicators(contratoId),
      getIndicadoresPorModulo(contratoId),
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
