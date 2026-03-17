import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importarPlanilhaXLSX } from "@/server/importers/xlsx-importer";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contratoId = formData.get("contratoId") as string | null;

    if (!contratoId) {
      return NextResponse.json(
        { message: "Selecione o contrato de destino" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { message: "Envie o arquivo .xlsx/.xls" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await importarPlanilhaXLSX(buffer, contratoId, session.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Import error:", e);
    return NextResponse.json(
      { message: "Erro ao importar planilha" },
      { status: 500 }
    );
  }
}
