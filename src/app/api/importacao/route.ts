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

    if (!file || !contratoId) {
      return NextResponse.json(
        { message: "Envie o arquivo e selecione o contrato" },
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
